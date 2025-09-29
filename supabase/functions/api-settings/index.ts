import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
}

serve(async (req): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const startTime = Date.now()
    
    // Validar token da API
    const tokenValidation = await validateApiToken(req, supabase)
    if (!tokenValidation.valid) {
      return tokenValidation.response
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const settingKey = pathSegments[pathSegments.length - 1]

    let result
    switch (req.method) {
      case 'GET':
        if (settingKey && settingKey !== 'settings') {
          result = await getSetting(settingKey, supabase)
        } else {
          result = await listSettings(url.searchParams, supabase)
        }
        break
      case 'PUT':
        result = await updateSetting(settingKey, req, supabase)
        break
      default:
        result = {
          status: 405,
          data: { error: 'Método não permitido' }
        }
    }

    // Log da requisição
    await logApiRequest(
      req,
      tokenValidation.tokenData.token_id,
      result.status,
      Date.now() - startTime,
      result.data,
      supabase
    )

    return new Response(
      JSON.stringify(result.data),
      { 
        status: result.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Erro na API de configurações:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function validateApiToken(req: Request, supabase: any) {
  const apiToken = req.headers.get('x-api-token')
  if (!apiToken) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token da API necessário no header x-api-token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  const { data: tokenData, error } = await supabase
    .rpc('validate_api_token', { token_string: apiToken })

  if (error || !tokenData || tokenData.length === 0) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token da API inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  const token = tokenData[0]
  if (!token.is_valid) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token da API inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Verificar scopes necessários para settings
  const requiredScopes = ['settings:read', 'settings:write']
  const hasRequiredScope = requiredScopes.some(scope => 
    token.scopes.includes(scope) || token.scopes.includes('*')
  )

  if (!hasRequiredScope) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token não possui permissões necessárias para configurações' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  return {
    valid: true,
    tokenData: token
  }
}

async function listSettings(searchParams: URLSearchParams, supabase: any) {
  const includePrivate = searchParams.get('include_private') === 'true'
  
  let query = supabase
    .from('system_settings')
    .select('id, key, value, description, created_at, updated_at')

  // Se não incluir privadas, filtrar apenas públicas
  if (!includePrivate) {
    query = query.or('key.like.public_%,key.eq.form_fields_config')
  }

  const { data, error } = await query.order('key')

  if (error) {
    return {
      status: 500,
      data: { error: 'Erro ao buscar configurações', details: error.message }
    }
  }

  return {
    status: 200,
    data: { settings: data }
  }
}

async function getSetting(key: string, supabase: any) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('id, key, value, description, created_at, updated_at')
    .eq('key', key)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        data: { error: 'Configuração não encontrada' }
      }
    }
    return {
      status: 500,
      data: { error: 'Erro ao buscar configuração', details: error.message }
    }
  }

  return {
    status: 200,
    data: { setting: data }
  }
}

async function updateSetting(key: string, req: Request, supabase: any) {
  if (!key || key === 'settings') {
    return {
      status: 400,
      data: { error: 'Chave da configuração é obrigatória' }
    }
  }

  const body = await req.json()
  const { value, description } = body

  if (value === undefined) {
    return {
      status: 400,
      data: { error: 'Valor é obrigatório' }
    }
  }

  const { data, error } = await supabase
    .from('system_settings')
    .upsert({
      key,
      value,
      description: description || null,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return {
      status: 500,
      data: { error: 'Erro ao atualizar configuração', details: error.message }
    }
  }

  return {
    status: 200,
    data: { success: true, setting: data }
  }
}

async function logApiRequest(
  req: Request,
  tokenId: string,
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