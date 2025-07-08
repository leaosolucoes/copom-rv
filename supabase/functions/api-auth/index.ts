import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 API AUTH - NEW REQUEST')
  console.log('Method:', req.method)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Configuração do Supabase
    const supabaseUrl = 'https://smytdnkylauxocqrkchn.supabase.co'
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔑 Service key available:', !!serviceKey)
    
    if (!serviceKey) {
      console.error('❌ NO SERVICE KEY')
      return new Response(
        JSON.stringify({ error: 'Service key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente Supabase para operações administrativas
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Cliente Supabase para validação do usuário
    const authHeader = req.headers.get('authorization')
    console.log('🔐 Auth header present:', !!authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userToken = authHeader.replace('Bearer ', '')
    console.log('🎟️ User token length:', userToken.length)

    // Verificar usuário usando o token
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    console.log('👤 User check:', { userId: user?.id, error: userError?.message })

    if (userError || !user) {
      console.log('❌ User authentication failed')
      return new Response(
        JSON.stringify({ error: 'Invalid user token: ' + (userError?.message || 'User not found') }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é super admin
    const isKnownSuperAdmin = user.id === '7c67cbf3-b43a-40ca-9adf-d78484ce3549'
    console.log('👑 Is super admin:', isKnownSuperAdmin)

    if (!isKnownSuperAdmin) {
      console.log('❌ Not super admin')
      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse do body
    let body: any = {}
    try {
      const rawBody = await req.text()
      console.log('📥 Raw body:', rawBody)
      if (rawBody) {
        body = JSON.parse(rawBody)
        console.log('📦 Parsed body:', body)
      }
    } catch (parseError) {
      console.error('❌ Body parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = body.action
    console.log('🎯 Action:', action)

    if (action !== 'generate-token') {
      console.log('❌ Invalid action:', action)
      return new Response(
        JSON.stringify({ error: 'Invalid action: ' + action }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar token único
    const tokenString = `sat_${body.token_type || 'production'}_${crypto.randomUUID().replace(/-/g, '')}`
    console.log('🎫 Generated token:', tokenString.substring(0, 25) + '...')
    
    // Hash do token
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(tokenString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log('🔒 Token hash generated')

    // Dados para inserção
    const insertData = {
      user_id: user.id,
      token_name: body.token_name || 'API Token',
      token_hash: tokenHash,
      token_type: body.token_type || 'production',
      scopes: Array.isArray(body.scopes) ? body.scopes : ['*'],
      rate_limit_per_hour: parseInt(body.rate_limit_per_hour) || 1000,
      expires_at: body.expires_at || null
    }
    console.log('💾 Insert data:', { ...insertData, token_hash: 'hidden' })

    // Inserir token usando cliente admin
    const { data: newToken, error: insertError } = await supabaseAdmin
      .from('api_tokens')
      .insert(insertData)
      .select()
      .single()

    console.log('💾 Insert result:', { success: !!newToken, error: insertError?.message })

    if (insertError) {
      console.error('❌ INSERT FAILED:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create token', 
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎉 TOKEN CREATED SUCCESS!')
    
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

  } catch (error: any) {
    console.error('💥 FATAL ERROR:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})