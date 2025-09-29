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
    const action = pathSegments[pathSegments.length - 1]
    const fileId = pathSegments[pathSegments.length - 1]

    let result
    switch (req.method) {
      case 'POST':
        if (action === 'media') {
          result = await uploadMedia(req, supabase)
        } else {
          result = { status: 400, data: { error: 'Endpoint de upload não reconhecido' } }
        }
        break
      case 'GET':
        if (fileId && fileId !== 'upload') {
          result = await downloadFile(fileId, supabase)
        } else {
          result = { status: 400, data: { error: 'ID do arquivo é obrigatório' } }
        }
        break
      case 'DELETE':
        if (fileId && fileId !== 'upload') {
          result = await deleteFile(fileId, supabase)
        } else {
          result = { status: 400, data: { error: 'ID do arquivo é obrigatório' } }
        }
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

    return new Response(
      JSON.stringify(result.data),
      { 
        status: result.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Erro na API de upload:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function validateApiToken(req: Request, supabase: any): Promise<{ valid: true; tokenData: any } | { valid: false; response: Response }> {
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

  return {
    valid: true,
    tokenData: token
  }
}

async function uploadMedia(req: Request, supabase: any) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return {
        status: 400,
        data: { error: 'Arquivo é obrigatório' }
      }
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        status: 400,
        data: { 
          error: 'Tipo de arquivo não permitido',
          allowed_types: allowedTypes
        }
      }
    }

    // Validar tamanho (50MB max)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return {
        status: 400,
        data: { error: 'Arquivo muito grande. Tamanho máximo: 50MB' }
      }
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    
    // Determinar bucket baseado no tipo
    const bucket = file.type.startsWith('image/') ? 'complaint-media' : 'complaint-media'
    const filePath = `api-uploads/${fileName}`

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        duplex: 'half'
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return {
        status: 500,
        data: { error: 'Erro ao fazer upload do arquivo', details: uploadError.message }
      }
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      status: 201,
      data: {
        success: true,
        file: {
          id: uploadData.path,
          name: file.name,
          size: file.size,
          type: file.type,
          url: urlData.publicUrl,
          uploaded_at: new Date().toISOString()
        }
      }
    }
  } catch (error: any) {
    console.error('Erro no upload:', error)
    return {
      status: 500,
      data: { error: 'Erro interno no upload', details: error.message }
    }
  }
}

async function downloadFile(fileId: string, supabase: any) {
  try {
    // Para downloads, retornar a URL pública
    const bucket = 'complaint-media' // Assumindo que todos os arquivos estão neste bucket
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileId)

    if (!urlData.publicUrl) {
      return {
        status: 404,
        data: { error: 'Arquivo não encontrado' }
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        file: {
          id: fileId,
          url: urlData.publicUrl,
          download_url: urlData.publicUrl
        }
      }
    }
  } catch (error: any) {
    return {
      status: 500,
      data: { error: 'Erro ao obter arquivo', details: error.message }
    }
  }
}

async function deleteFile(fileId: string, supabase: any) {
  try {
    const bucket = 'complaint-media'
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileId])

    if (error) {
      return {
        status: 500,
        data: { error: 'Erro ao deletar arquivo', details: error.message }
      }
    }

    return {
      status: 200,
      data: { 
        success: true, 
        message: 'Arquivo deletado com sucesso' 
      }
    }
  } catch (error: any) {
    return {
      status: 500,
      data: { error: 'Erro interno ao deletar arquivo', details: error.message }
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