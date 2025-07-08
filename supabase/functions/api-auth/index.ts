import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 API AUTH STARTED')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com service role
    const supabaseUrl = 'https://smytdnkylauxocqrkchn.supabase.co'
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔑 Service key exists:', !!serviceKey)
    console.log('🔑 Service key length:', serviceKey?.length || 0)
    
    if (!serviceKey) {
      console.error('❌ NO SERVICE KEY FOUND')
      return new Response(
        JSON.stringify({ error: 'Service key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('✅ Supabase client created')

    // Parse body
    let body: any = {}
    if (req.method === 'POST') {
      const rawBody = await req.text()
      console.log('📥 Raw body:', rawBody)
      body = JSON.parse(rawBody)
      console.log('📦 Parsed body:', body)
    }

    const action = body.action
    console.log('🎯 Action:', action)

    if (action !== 'generate-token') {
      console.log('❌ Invalid action')
      return new Response(
        JSON.stringify({ error: 'Invalid action: ' + action }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar auth header
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

    // Verificar usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken)
    console.log('👤 User ID:', user?.id)
    console.log('👤 User error:', userError?.message)

    if (userError || !user) {
      console.log('❌ User authentication failed')
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é super admin DIRETAMENTE
    const isKnownSuperAdmin = user.id === '7c67cbf3-b43a-40ca-9adf-d78484ce3549'
    console.log('👑 Is known super admin:', isKnownSuperAdmin)

    if (!isKnownSuperAdmin) {
      console.log('❌ Not super admin')
      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar token
    const tokenString = `sat_${body.token_type || 'production'}_${crypto.randomUUID().replace(/-/g, '')}`
    console.log('🎫 Generated token prefix:', tokenString.substring(0, 20))
    
    // Hash token
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(tokenString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log('🔒 Token hash length:', tokenHash.length)

    // Preparar dados para inserção
    const insertData = {
      user_id: user.id,
      token_name: body.token_name || 'API Token',
      token_hash: tokenHash,
      token_type: body.token_type || 'production',
      scopes: body.scopes || ['*'],
      rate_limit_per_hour: body.rate_limit_per_hour || 1000,
      expires_at: body.expires_at || null
    }
    console.log('💾 Insert data:', insertData)

    // Inserir token
    const { data: newToken, error: insertError } = await supabase
      .from('api_tokens')
      .insert(insertData)
      .select()
      .single()

    console.log('💾 Insert success:', !!newToken)
    console.log('💾 Insert error:', insertError?.message)

    if (insertError) {
      console.error('❌ DATABASE INSERT FAILED:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create token', 
          details: insertError.message,
          code: insertError.code 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎉 TOKEN CREATED SUCCESSFULLY!')
    
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
    console.error('💥 Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})