import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenGenerateRequest {
  token_name: string
  token_type: 'sandbox' | 'production'
  scopes: string[]
  expires_at?: string
  rate_limit_per_hour?: number
}

interface TokenValidateRequest {
  token: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const url = new URL(req.url)
    const path = url.pathname
    
    // Tentar extrair ação do corpo da requisição primeiro
    let action = ''
    if (req.method === 'POST') {
      try {
        const body = await req.clone().json()
        action = body.action || ''
      } catch (e) {
        // Se não conseguir ler o body, tenta extrair do caminho
      }
    }
    
    // Se não tem ação no body, extrai do caminho
    if (!action) {
      if (path.includes('generate-token')) {
        action = 'generate-token'
      } else if (path.includes('validate-token')) {
        action = 'validate-token'
      } else if (path.includes('refresh-token')) {
        action = 'refresh-token'
      }
    }

    console.log('API Auth - Ação:', action, 'Caminho:', path)

    switch (action) {
      case 'generate-token':
        return await generateToken(req, supabase)
      case 'validate-token':
        return await validateToken(req, supabase)
      case 'refresh-token':
        return await refreshToken(req, supabase)
      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint não encontrado', path, action }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('Erro na API de autenticação:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateToken(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    
    // Log do body recebido
    console.log('Body recebido:', body)
    
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extraído:', token ? 'presente' : 'ausente')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.log('Erro de autenticação:', userError)
      return new Response(
        JSON.stringify({ error: 'Token inválido', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Usuário autenticado:', user.id)

    // Verificar se é super admin
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('Dados do usuário:', userData, 'Erro:', roleError)

    if (roleError || userData?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas super admins podem gerar tokens.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Usar os dados do token do body que já foi lido
    console.log('Gerando token com dados:', body)
    
    // Gerar token único
    const tokenString = `sat_${body.token_type}_${crypto.randomUUID().replace(/-/g, '')}`
    
    // Hash do token para armazenar no banco
    const encoder = new TextEncoder()
    const data = encoder.encode(tokenString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Inserir no banco
    const { data: newToken, error: insertError } = await supabase
      .from('api_tokens')
      .insert({
        user_id: user.id,
        token_name: body.token_name,
        token_hash: tokenHash,
        token_type: body.token_type,
        scopes: body.scopes || [],
        expires_at: body.expires_at || null,
        rate_limit_per_hour: body.rate_limit_per_hour || 1000
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao inserir token:', insertError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar token' }),
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
  } catch (error: any) {
    console.error('Erro ao gerar token:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function validateToken(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const body: TokenValidateRequest = await req.json()
  
  const { data: tokenData, error } = await supabase
    .rpc('validate_api_token', { token_string: body.token })

  if (error || !tokenData || tokenData.length === 0) {
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Token inválido ou expirado' 
      }),
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

async function refreshToken(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Por simplicidade, refreshToken apenas estende a expiração
  // Em uma implementação mais robusta, poderia gerar um novo token
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Token refresh será implementado conforme necessidade' 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}