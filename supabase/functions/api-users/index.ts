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
    const userId = pathSegments[pathSegments.length - 1]

    let result
    switch (req.method) {
      case 'GET':
        if (userId && userId !== 'users') {
          result = await getUser(userId, supabase)
        } else {
          result = await listUsers(url.searchParams, supabase)
        }
        break
      case 'POST':
        result = await createUser(req, supabase)
        break
      case 'PUT':
        result = await updateUser(userId, req, supabase)
        break
      case 'DELETE':
        result = await deleteUser(userId, supabase)
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
    console.error('Erro na API de usuários:', error)
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

  // Verificar scopes necessários para users
  const requiredScopes = ['users:read', 'users:write', 'users:delete']
  const hasRequiredScope = requiredScopes.some(scope => 
    token.scopes.includes(scope) || token.scopes.includes('*')
  )

  if (!hasRequiredScope) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token não possui permissões necessárias para usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  return {
    valid: true,
    tokenData: token
  }
}

async function listUsers(searchParams: URLSearchParams, supabase: any) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const search = searchParams.get('search')
  const role = searchParams.get('role')
  const isActive = searchParams.get('is_active')

  let query = supabase
    .from('users')
    .select('id, email, full_name, role, is_active, created_at, last_login, updated_at', { count: 'exact' })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (role) {
    query = query.eq('role', role)
  }

  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true')
  }

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      status: 500,
      data: { error: 'Erro ao buscar usuários', details: error.message }
    }
  }

  return {
    status: 200,
    data: {
      users: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }
}

async function getUser(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active, created_at, last_login, updated_at')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        data: { error: 'Usuário não encontrado' }
      }
    }
    return {
      status: 500,
      data: { error: 'Erro ao buscar usuário', details: error.message }
    }
  }

  return {
    status: 200,
    data: { user: data }
  }
}

async function createUser(req: Request, supabase: any) {
  const body = await req.json()
  
  const { email, full_name, password, role = 'atendente', is_active = true } = body

  if (!email || !full_name || !password) {
    return {
      status: 400,
      data: { error: 'Email, nome completo e senha são obrigatórios' }
    }
  }

  const { data, error } = await supabase
    .rpc('create_user_secure', {
      p_email: email,
      p_full_name: full_name,
      p_password: password,
      p_role: role,
      p_is_active: is_active
    })

  if (error || data?.error) {
    return {
      status: 400,
      data: { error: data?.error || error.message }
    }
  }

  return {
    status: 201,
    data: { success: true, user: data.user }
  }
}

async function updateUser(userId: string, req: Request, supabase: any) {
  if (!userId || userId === 'users') {
    return {
      status: 400,
      data: { error: 'ID do usuário é obrigatório' }
    }
  }

  const body = await req.json()
  const { email, full_name, password, role, is_active } = body

  if (!email || !full_name) {
    return {
      status: 400,
      data: { error: 'Email e nome completo são obrigatórios' }
    }
  }

  const { data, error } = await supabase
    .rpc('update_user_secure', {
      p_user_id: userId,
      p_email: email,
      p_full_name: full_name,
      p_password: password || null,
      p_role: role || null,
      p_is_active: is_active
    })

  if (error || data?.error) {
    return {
      status: 400,
      data: { error: data?.error || error.message }
    }
  }

  return {
    status: 200,
    data: { success: true, message: 'Usuário atualizado com sucesso' }
  }
}

async function deleteUser(userId: string, supabase: any) {
  if (!userId || userId === 'users') {
    return {
      status: 400,
      data: { error: 'ID do usuário é obrigatório' }
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) {
    return {
      status: 500,
      data: { error: 'Erro ao desativar usuário', details: error.message }
    }
  }

  return {
    status: 200,
    data: { success: true, message: 'Usuário desativado com sucesso' }
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