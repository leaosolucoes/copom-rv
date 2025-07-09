import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('=== INÍCIO DA REQUISIÇÃO ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Log de todos os headers
  console.log('=== HEADERS RECEBIDOS ===')
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value}`)
  }
  
  // Verificar se é uma requisição válida
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Use POST.' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Verificar token simples
  const apiToken = req.headers.get('x-api-token')
  console.log('Token encontrado:', apiToken)
  
  if (!apiToken) {
    console.log('ERRO: Token não encontrado!')
    return new Response(
      JSON.stringify({ error: 'Token da API necessário no header x-api-token' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Verificar se é o token correto
  if (apiToken !== 'sat_production_3ea84279b2484a138e6fba8ebec5c7e0') {
    console.log('ERRO: Token inválido!')
    return new Response(
      JSON.stringify({ error: 'Token da API inválido' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  console.log('Token válido! Processando requisição...')

  try {
    const body = await req.json()
    console.log('Body recebido:', JSON.stringify(body, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API funcionando!', 
        data: body 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function validateApiToken(req: Request, supabase: any) {
  // Log de debugging - ver todos os headers
  console.log('Headers recebidos:')
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value}`)
  }
  
  // Tentar pegar o token do header x-api-token primeiro
  let apiToken = req.headers.get('x-api-token')
  console.log('x-api-token encontrado:', apiToken)
  
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

  return {
    valid: true,
    tokenData: token
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
      narrative,
      photos,
      videos,
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
      narrative.ilike.%${search}%,
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
  
  const requiredFields = [
    'complainant_name', 'complainant_phone', 'complainant_type',
    'complainant_address', 'complainant_neighborhood',
    'occurrence_type', 'occurrence_address', 'occurrence_neighborhood',
    'classification', 'narrative'
  ]

  for (const field of requiredFields) {
    if (!body[field]) {
      return {
        status: 400,
        data: { error: `Campo obrigatório: ${field}` }
      }
    }
  }

  // Gerar identificador único do sistema
  const systemIdentifier = `DEN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  const complaintData = {
    ...body,
    system_identifier: systemIdentifier,
    status: 'nova',
    user_ip: req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'API',
    user_device_type: 'API'
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