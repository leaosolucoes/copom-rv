import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
}

serve(async (req): Promise<Response> => {
  console.log('🚀 API-COMPLAINTS INICIADA')
  console.log('Timestamp:', new Date().toISOString())
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight - respondendo')
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const url = new URL(req.url)
  const path = url.pathname

  console.log('=== INÍCIO DA REQUISIÇÃO ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Path:', path)
  console.log('Query params:', url.search)
  
  // Verificar se é uma requisição válida
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Criar cliente Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Validar token de API
  const tokenValidation = await validateApiToken(req, supabase)
  if (!tokenValidation.valid) {
    return tokenValidation.response
  }

  console.log('Token válido! Processando requisição...')

  let result
  let statusCode = 200

  try {
    // Verificar escopo de permissão
    const tokenData = tokenValidation.tokenData
    const requiredScope = req.method === 'GET' ? 'complaints:read' : 'complaints:write'
    
    if (!tokenData.scopes.includes(requiredScope) && !tokenData.scopes.includes('*')) {
      return new Response(
        JSON.stringify({ error: `Permissão insuficiente. Escopo necessário: ${requiredScope}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Roteamento baseado no método e path
    if (req.method === 'GET') {
      const searchParams = url.searchParams
      const pathParts = path.split('/').filter(p => p)
      
      if (pathParts.length === 1) {
        // GET /api-complaints - Listar denúncias
        result = await listComplaints(searchParams, supabase)
      } else if (pathParts.length === 2) {
        const complaintId = pathParts[1]
        if (pathParts[1] === 'media') {
          return new Response(
            JSON.stringify({ error: 'ID da denúncia é obrigatório para buscar mídia' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // GET /api-complaints/{id} - Buscar denúncia específica
        result = await getComplaint(complaintId, supabase)
      } else if (pathParts.length === 3 && pathParts[2] === 'media') {
        // GET /api-complaints/{id}/media - Buscar mídia da denúncia
        const complaintId = pathParts[1]
        result = await getComplaintMedia(complaintId, supabase)
      } else {
        return new Response(
          JSON.stringify({ error: 'Endpoint não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (req.method === 'POST') {
      // POST /api-complaints - Criar nova denúncia
      result = await createComplaint(req, supabase)
    } else if (req.method === 'PUT') {
      const pathParts = path.split('/').filter(p => p)
      if (pathParts.length === 2) {
        // PUT /api-complaints/{id} - Atualizar denúncia
        const complaintId = pathParts[1]
        result = await updateComplaint(complaintId, req, supabase)
      } else if (pathParts.length === 3 && pathParts[2] === 'status') {
        // PUT /api-complaints/{id}/status - Atualizar status da denúncia
        const complaintId = pathParts[1]
        result = await updateComplaintStatus(complaintId, req, supabase)
      } else {
        return new Response(
          JSON.stringify({ error: 'Endpoint não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (req.method === 'DELETE') {
      const pathParts = path.split('/').filter(p => p)
      if (pathParts.length === 2) {
        // DELETE /api-complaints/{id} - Deletar denúncia
        const complaintId = pathParts[1]
        
        // Verificar se tem permissão de delete
        if (!tokenData.scopes.includes('complaints:delete') && !tokenData.scopes.includes('*')) {
          return new Response(
            JSON.stringify({ error: 'Permissão insuficiente. Escopo necessário: complaints:delete' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        result = await deleteComplaint(complaintId, supabase)
      } else {
        return new Response(
          JSON.stringify({ error: 'Endpoint não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    statusCode = result?.status || 500
    const executionTime = Date.now() - startTime

    // Log da requisição
    if (result) {
      await logApiRequest(req, tokenData.token_id, statusCode, executionTime, result.data, supabase)
    }

    return new Response(
      JSON.stringify(result?.data || { error: 'Resposta inválida' }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Erro ao processar requisição:', error)
    const executionTime = Date.now() - startTime

    // Log do erro
    if (tokenValidation.tokenData) {
      await logApiRequest(req, tokenValidation.tokenData.token_id, 500, executionTime, { error: error?.message || String(error) }, supabase)
    }

    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error?.message || String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function validateApiToken(req: Request, supabase: any): Promise<{ valid: true; tokenData: any } | { valid: false; response: Response }> {
  console.log('🔐 INICIANDO VALIDAÇÃO DE TOKEN')
  
  // Log de debugging - ver todos os headers
  console.log('📋 Headers recebidos:')
  for (const [key, value] of req.headers.entries()) {
    // Não mostrar o token completo por segurança, apenas início
    if (key === 'x-api-token') {
      console.log(`${key}: ${value ? value.substring(0, 20) + '...' : 'null'}`)
    } else {
      console.log(`${key}: ${value}`)
    }
  }
  
  // Tentar pegar o token do header x-api-token primeiro
  let apiToken = req.headers.get('x-api-token')
  console.log('🎫 x-api-token presente:', !!apiToken)
  if (apiToken) {
    console.log('🎫 Token começa com:', apiToken.substring(0, 20) + '...')
  }
  
  // Se não encontrar, tentar pegar do Authorization header
  if (!apiToken) {
    const authHeader = req.headers.get('authorization')
    console.log('Authorization header encontrado:', authHeader)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiToken = authHeader.substring(7) // Remove "Bearer "
      console.log('Token extraído do Authorization:', apiToken)
    }
  }
  
  if (!apiToken) {
    console.log('Nenhum token encontrado!')
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token da API necessário no header x-api-token ou Authorization Bearer' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Gerar hash do token usando o mesmo método da api-auth
  console.log('🔒 Gerando hash do token...')
  console.log('🔒 Token original (primeiros 30 caracteres):', apiToken.substring(0, 30))
  
  const encoder = new TextEncoder()
  const tokenData = encoder.encode(apiToken)
  const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  console.log('🔒 Hash gerado (primeiros 40 caracteres):', tokenHash.substring(0, 40))

  // Buscar token pelo hash diretamente na tabela
  console.log('🔍 Buscando token na base de dados...')
  const { data: tokens, error } = await supabase
    .from('api_tokens')
    .select('id, active, permissions')
    .eq('token', tokenHash)
    .limit(1)

  console.log('📊 Resultado da busca:')
  console.log('  - Tokens encontrados:', tokens?.length || 0)
  console.log('  - Erro:', error?.message || 'nenhum')
  if (tokens && tokens.length > 0) {
    console.log('  - Token ID:', tokens[0].id)
    console.log('  - Token ativo:', tokens[0].active)
    console.log('  - Permissões:', JSON.stringify(tokens[0].permissions))
  }

  if (error || !tokens || tokens.length === 0) {
    console.log('Token não encontrado ou erro na busca')
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token da API inválido ou expirado', details: error?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  const token = tokens[0]
  if (!token.active) {
    console.log('Token inativo')
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token da API inativo' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  console.log('Token válido e ativo!')
  return {
    valid: true,
    tokenData: {
      token_id: token.id,
      is_valid: token.active,
      scopes: token.permissions || []
    }
  }
}

async function listComplaints(searchParams: URLSearchParams, supabase: any) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const status = searchParams.get('status')
  const classification = searchParams.get('classification')
  const occurrence_type = searchParams.get('occurrence_type')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')
  const search = searchParams.get('search')

  let query = supabase
    .from('complaints')
    .select(`
      id, 
      system_identifier,
      complainant_name, 
      complainant_phone,
      complainant_type,
      occurrence_type, 
      occurrence_address,
      occurrence_neighborhood,
      occurrence_date,
      occurrence_time,
      classification, 
      status, 
      description,
      photos,
      videos,
      user_location,
      user_device_type,
      user_browser,
      user_ip,
      user_agent,
      created_at,
      updated_at,
      processed_at
    `, { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }

  if (classification) {
    query = query.eq('classification', classification)
  }

  if (occurrence_type) {
    query = query.eq('occurrence_type', occurrence_type)
  }

  if (date_from) {
    query = query.gte('created_at', date_from)
  }

  if (date_to) {
    query = query.lte('created_at', date_to)
  }

  if (search) {
    query = query.or(`
      complainant_name.ilike.%${search}%,
      occurrence_address.ilike.%${search}%,
      description.ilike.%${search}%,
      system_identifier.ilike.%${search}%
    `)
  }

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      status: 500,
      data: { error: 'Erro ao buscar denúncias', details: error.message }
    }
  }

  return {
    status: 200,
    data: {
      complaints: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }
}

async function getComplaint(complaintId: string, supabase: any) {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', complaintId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        data: { error: 'Denúncia não encontrada' }
      }
    }
    return {
      status: 500,
      data: { error: 'Erro ao buscar denúncia', details: error.message }
    }
  }

  return {
    status: 200,
    data: { complaint: data }
  }
}

async function getComplaintMedia(complaintId: string, supabase: any) {
  const { data, error } = await supabase
    .from('complaints')
    .select('photos, videos')
    .eq('id', complaintId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        data: { error: 'Denúncia não encontrada' }
      }
    }
    return {
      status: 500,
      data: { error: 'Erro ao buscar mídia da denúncia', details: error.message }
    }
  }

  return {
    status: 200,
    data: { 
      media: {
        photos: data.photos || [],
        videos: data.videos || []
      }
    }
  }
}

async function createComplaint(req: Request, supabase: any) {
  const body = await req.json()
  
  // Converter nomes de campos com hífen para underscore
  const normalizedBody: any = {}
  for (const [key, value] of Object.entries(body)) {
    const normalizedKey = key.replace(/-/g, '_')
    normalizedBody[normalizedKey] = value
  }
  
  console.log('Body original:', body)
  console.log('Body normalizado:', normalizedBody)
  
  // Processar user_location se vier como string
  if (normalizedBody.user_location && typeof normalizedBody.user_location === 'string') {
    try {
      // Se vier como três linhas separadas (latitude\nlongitude\naccuracy)
      const lines = normalizedBody.user_location.trim().split('\n')
      if (lines.length >= 2) {
        const latitude = parseFloat(lines[0])
        const longitude = parseFloat(lines[1])
        const accuracy = lines.length >= 3 ? parseFloat(lines[2]) : null
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          normalizedBody.user_location = {
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy !== null && !isNaN(accuracy) ? accuracy : 0
          }
          console.log('user_location convertido:', normalizedBody.user_location)
        }
      }
      // Se vier como JSON string, tentar fazer parse
      else if (normalizedBody.user_location.startsWith('{')) {
        normalizedBody.user_location = JSON.parse(normalizedBody.user_location)
      }
    } catch (error) {
      console.error('Erro ao processar user_location:', error)
      // Manter valor original se não conseguir processar
    }
  }
  
  const requiredFields = [
    'complainant_name', 'complainant_phone', 'complainant_type',
    'complainant_address', 'complainant_neighborhood',
    'occurrence_type', 'occurrence_address', 'occurrence_neighborhood',
    'classification', 'description'
  ]

  for (const field of requiredFields) {
    if (!normalizedBody[field]) {
      return {
        status: 400,
        data: { error: `Campo obrigatório: ${field}` }
      }
    }
  }

  // Gerar identificador único do sistema
  const systemIdentifier = `DEN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  // Extract first IP from x-forwarded-for header (can contain multiple IPs)
  const forwardedFor = req.headers.get('x-forwarded-for')
  const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

  const complaintData = {
    ...normalizedBody,
    system_identifier: systemIdentifier,
    status: 'nova',
    user_ip: clientIP,
    user_agent: req.headers.get('user-agent') || 'API',
    user_device_type: normalizedBody.user_device_type || 'API'
  }

  const { data, error } = await supabase
    .from('complaints')
    .insert(complaintData)
    .select()
    .single()

  if (error) {
    return {
      status: 400,
      data: { error: 'Erro ao criar denúncia', details: error.message }
    }
  }

  return {
    status: 201,
    data: { success: true, complaint: data }
  }
}

async function updateComplaint(complaintId: string, req: Request, supabase: any) {
  if (!complaintId || complaintId === 'complaints') {
    return {
      status: 400,
      data: { error: 'ID da denúncia é obrigatório' }
    }
  }

  const body = await req.json()
  
  // Remover campos que não devem ser atualizados via API
  const { id, created_at, system_identifier, ...updateData } = body

  const { data, error } = await supabase
    .from('complaints')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', complaintId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        data: { error: 'Denúncia não encontrada' }
      }
    }
    return {
      status: 500,
      data: { error: 'Erro ao atualizar denúncia', details: error.message }
    }
  }

  return {
    status: 200,
    data: { success: true, complaint: data }
  }
}

async function updateComplaintStatus(complaintId: string, req: Request, supabase: any) {
  if (!complaintId) {
    return {
      status: 400,
      data: { error: 'ID da denúncia é obrigatório' }
    }
  }

  const body = await req.json()
  const { status } = body

  if (!status) {
    return {
      status: 400,
      data: { error: 'Status é obrigatório' }
    }
  }

  const validStatuses = ['nova', 'cadastrada', 'finalizada', 'a_verificar', 'verificado']
  if (!validStatuses.includes(status)) {
    return {
      status: 400,
      data: { error: `Status inválido. Valores permitidos: ${validStatuses.join(', ')}` }
    }
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'finalizada' || status === 'verificado') {
    updateData.processed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('complaints')
    .update(updateData)
    .eq('id', complaintId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        status: 404,
        data: { error: 'Denúncia não encontrada' }
      }
    }
    return {
      status: 500,
      data: { error: 'Erro ao atualizar status da denúncia', details: error.message }
    }
  }

  return {
    status: 200,
    data: { success: true, complaint: data }
  }
}

async function deleteComplaint(complaintId: string, supabase: any) {
  if (!complaintId || complaintId === 'complaints') {
    return {
      status: 400,
      data: { error: 'ID da denúncia é obrigatório' }
    }
  }

  const { error } = await supabase
    .from('complaints')
    .delete()
    .eq('id', complaintId)

  if (error) {
    return {
      status: 500,
      data: { error: 'Erro ao deletar denúncia', details: error.message }
    }
  }

  return {
    status: 200,
    data: { success: true, message: 'Denúncia deletada com sucesso' }
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