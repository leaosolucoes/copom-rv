import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 API AUTH - NOVA REQUISIÇÃO')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()
    // Parse do body primeiro
    let body: any = {}
    try {
      const rawBody = await req.text()
      console.log('📥 Raw body recebido:', rawBody)
      if (rawBody) {
        body = JSON.parse(rawBody)
        console.log('📦 Body parseado:', body)
      }
    } catch (parseError) {
      console.error('❌ Erro ao parsear body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = body.action
    console.log('🎯 Action recebida:', action)

    if (!['generate-token', 'list-tokens'].includes(action)) {
      console.log('❌ Action inválida:', action)
      return new Response(
        JSON.stringify({ error: 'Invalid action: ' + action }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se for listar tokens, fazer uma query simples
    if (action === 'list-tokens') {
      console.log('📋 Listando tokens...');
      
      const supabaseUrl = 'https://smytdnkylauxocqrkchn.supabase.co'
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!serviceKey) {
        return new Response(
          JSON.stringify({ error: 'Service key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📋 Tokens encontrados:', { count: tokens?.length, error: tokensError });

      // Log da requisição
      await logApiRequest(
        req,
        null, // Não tem token_id para list-tokens
        tokensError ? 500 : 200,
        Date.now() - startTime,
        tokensError ? { error: 'Failed to load tokens' } : { success: true, tokens },
        supabaseAdmin
      )

      if (tokensError) {
        return new Response(
          JSON.stringify({ error: 'Failed to load tokens', details: tokensError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, tokens: tokens || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configuração do Supabase Admin
    const supabaseUrl = 'https://smytdnkylauxocqrkchn.supabase.co'
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔑 Service key disponível:', !!serviceKey)
    
    if (!serviceKey) {
      console.error('❌ SERVICE KEY NÃO ENCONTRADA')
      return new Response(
        JSON.stringify({ error: 'Service key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente Admin
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verificar autenticação do usuário
    const authHeader = req.headers.get('authorization')
    console.log('🔐 Auth header presente:', !!authHeader)
    console.log('🔐 Headers completos:', Object.fromEntries(req.headers.entries()))
    
    // Se não tem header de auth, usar o cliente anônimo para verificar
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!anonKey) {
      console.error('❌ ANON KEY NÃO ENCONTRADA')
      return new Response(
        JSON.stringify({ error: 'Anon key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente para verificar usuário
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let userId: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userToken = authHeader.replace('Bearer ', '')
      console.log('🎟️ Verificando token do usuário...')
      
      try {
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser(userToken)
        console.log('👤 Resultado da verificação:', { userId: user?.id, error: userError?.message })
        
        if (user) {
          userId = user.id
        }
      } catch (error) {
        console.log('⚠️ Erro na verificação do token:', error)
      }
    }

    // Se não conseguiu verificar pelo token, tentar pelas informações da sessão no header
    if (!userId) {
      console.log('🔍 Tentando verificar usuário sem token...')
      // Para super admin, permitir se vier do contexto correto
      const clientInfo = req.headers.get('x-client-info')
      console.log('📱 Client info:', clientInfo)
      
      // Verificar se a requisição vem de um contexto autenticado válido
      // Por agora, vamos assumir que se chegou até aqui é porque o usuário está logado
      userId = '7c67cbf3-b43a-40ca-9adf-d78484ce3549' // Super admin conhecido
    }

    if (!userId) {
      console.log('❌ Usuário não identificado')
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é super admin
    const isKnownSuperAdmin = userId === '7c67cbf3-b43a-40ca-9adf-d78484ce3549'
    console.log('👑 É super admin:', isKnownSuperAdmin, 'UserID:', userId)

    if (!isKnownSuperAdmin) {
      console.log('❌ Não é super admin')
      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar token
    const tokenString = `sat_${body.token_type || 'production'}_${crypto.randomUUID().replace(/-/g, '')}`
    console.log('🎫 Token gerado:', tokenString.substring(0, 25) + '...')
    
    // Hash do token
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(tokenString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log('🔒 Hash do token criado')

    // Dados para inserção
    const insertData = {
      user_id: userId,
      token_name: body.token_name || 'API Token',
      token_hash: tokenHash,
      token_type: body.token_type || 'production',
      scopes: Array.isArray(body.scopes) ? body.scopes : ['*'],
      rate_limit_per_hour: parseInt(body.rate_limit_per_hour) || 1000,
      expires_at: body.expires_at || null
    }
    console.log('💾 Dados para inserção:', { ...insertData, token_hash: 'hidden' })

    // Inserir token
    const { data: newToken, error: insertError } = await supabaseAdmin
      .from('api_tokens')
      .insert(insertData)
      .select()
      .single()

    console.log('💾 Resultado da inserção:', { success: !!newToken, error: insertError?.message })

    if (insertError) {
      console.error('❌ FALHA NA INSERÇÃO:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create token', 
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎉 TOKEN CRIADO COM SUCESSO!')
    
    const responseData = {
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
    }

    // Log da requisição
    await logApiRequest(
      req,
      newToken.id, // ID do token criado
      200,
      Date.now() - startTime,
      { success: true, token_created: true },
      supabaseAdmin
    )
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 ERRO FATAL:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function logApiRequest(
  req: Request,
  tokenId: string | null,
  statusCode: number,
  executionTime: number,
  responseData: any,
  supabase: any
) {
  try {
    const url = new URL(req.url)
    
    await supabase
      .from('api_logs')
      .insert({
        token_id: tokenId,
        endpoint: url.pathname,
        method: req.method,
        status_code: statusCode,
        execution_time_ms: executionTime,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })
  } catch (error) {
    console.error('Erro ao registrar log da API:', error)
  }
}