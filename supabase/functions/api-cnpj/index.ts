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
    const cnpj = pathSegments[pathSegments.length - 1]
    const action = pathSegments[pathSegments.length - 1]

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Apenas método GET é permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let result
    if (action === 'pdf' && pathSegments.length > 2) {
      const actualCnpj = pathSegments[pathSegments.length - 2]
      result = await generateCnpjPdf(actualCnpj, supabase)
    } else if (cnpj && cnpj !== 'cnpj') {
      result = await searchCnpj(cnpj, supabase)
    } else {
      result = {
        status: 400,
        data: { error: 'CNPJ é obrigatório' }
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
    console.error('Erro na API de CNPJ:', error)
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

  // Verificar scopes necessários para CNPJ
  const requiredScopes = ['cnpj:read']
  const hasRequiredScope = requiredScopes.some(scope => 
    token.scopes.includes(scope) || token.scopes.includes('*')
  )

  if (!hasRequiredScope) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Token não possui permissões necessárias para consulta de CNPJ' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  return {
    valid: true,
    tokenData: token
  }
}

async function searchCnpj(cnpj: string, supabase: any) {
  // Limpar CNPJ (remover caracteres especiais)
  const cleanCnpj = cnpj.replace(/[^\d]/g, '')
  
  if (cleanCnpj.length !== 14) {
    return {
      status: 400,
      data: { error: 'CNPJ deve ter 14 dígitos' }
    }
  }

  try {
    // Chamar a função search-cnpj existente
    const response = await fetch('https://smytdnkylauxocqrkchn.supabase.co/functions/v1/search-cnpj', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y'
      },
      body: JSON.stringify({ cnpj: cleanCnpj }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      return {
        status: response.status || 400,
        data: { error: result.error || 'Erro ao consultar CNPJ' }
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        cnpj_data: result.data,
        consulted_at: new Date().toISOString()
      }
    }
  } catch (error: any) {
    return {
      status: 500,
      data: { error: 'Erro ao consultar CNPJ', details: error.message }
    }
  }
}

async function generateCnpjPdf(cnpj: string, supabase: any) {
  // Por simplicidade, retornar instrução para gerar PDF
  // Em uma implementação completa, seria necessário usar uma biblioteca de PDF
  
  return {
    status: 200,
    data: {
      success: true,
      message: 'Para gerar PDF, use primeiro a consulta de CNPJ e depois utilize os dados retornados para gerar o PDF no frontend',
      cnpj: cnpj,
      pdf_generation_available: false,
      instructions: {
        step1: 'Faça GET /api/cnpj/{cnpj} para obter dados',
        step2: 'Use os dados retornados para gerar PDF no frontend ou integração'
      }
    }
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