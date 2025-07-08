import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== API AUTH REQUEST ===')
  console.log('Method:', req.method)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      'https://smytdnkylauxocqrkchn.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    let body: any = {}
    if (req.method === 'POST') {
      const text = await req.text()
      console.log('Request body:', text)
      body = JSON.parse(text)
    }

    const action = body.action
    console.log('Action:', action)

    if (action === 'generate-token') {
      // Verificar autorização
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      console.log('Auth token length:', token.length)

      // Verificar usuário
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      console.log('User check:', { userId: user?.id, error: userError?.message })

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verificar se é super admin usando função database
      const { data: roleCheck, error: roleError } = await supabase
        .rpc('is_current_user_super_admin_safe')

      console.log('Role check:', { isAdmin: roleCheck, error: roleError?.message })

      if (roleError || !roleCheck) {
        return new Response(
          JSON.stringify({ error: 'Access denied. Super admin required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Gerar token
      const tokenString = `sat_${body.token_type || 'production'}_${crypto.randomUUID().replace(/-/g, '')}`
      console.log('Generated token:', tokenString.substring(0, 20) + '...')
      
      // Hash do token
      const encoder = new TextEncoder()
      const data = encoder.encode(tokenString)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Inserir token no banco
      const { data: newToken, error: insertError } = await supabase
        .from('api_tokens')
        .insert({
          user_id: user.id,
          token_name: body.token_name || 'Generated Token',
          token_hash: tokenHash,
          token_type: body.token_type || 'production',
          scopes: body.scopes || ['*'],
          rate_limit_per_hour: body.rate_limit_per_hour || 1000,
          expires_at: body.expires_at || null
        })
        .select()
        .single()

      console.log('Insert result:', { success: !!newToken, error: insertError?.message })

      if (insertError) {
        console.error('Insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create token', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          token: tokenString,
          token_info: {
            id: newToken.id,
            name: newToken.token_name,
            type: newToken.token_type,
            scopes: newToken.scopes,
            expires_at: newToken.expires_at,
            rate_limit_per_hour: newToken.rate_limit_per_hour
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'validate-token') {
      const { data: tokenData, error } = await supabase
        .rpc('validate_api_token', { token_string: body.token })

      if (error || !tokenData || tokenData.length === 0) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = tokenData[0]
      return new Response(
        JSON.stringify({
          valid: token.is_valid,
          token_info: {
            id: token.token_id,
            user_id: token.user_id,
            type: token.token_type,
            scopes: token.scopes,
            rate_limit_per_hour: token.rate_limit_per_hour
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('FATAL ERROR:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})