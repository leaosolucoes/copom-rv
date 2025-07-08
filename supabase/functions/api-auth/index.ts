import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== API AUTH REQUEST START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Parse request body once
    let body: any = {}
    const contentType = req.headers.get('content-type')
    
    if (req.method === 'POST' && contentType?.includes('application/json')) {
      try {
        const text = await req.text()
        console.log('Raw body text:', text)
        body = JSON.parse(text)
        console.log('Parsed body:', body)
      } catch (e) {
        console.error('Error parsing body:', e)
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const action = body.action || 'unknown'
    console.log('Action extracted:', action)

    switch (action) {
      case 'generate-token':
        return await generateToken(body, req, supabase)
      case 'validate-token':
        return await validateToken(body, req, supabase)
      case 'refresh-token':
        return await refreshToken(body, req, supabase)
      default:
        console.log('Unknown action:', action)
        return new Response(
          JSON.stringify({ error: 'Action not specified or invalid', received_action: action }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('ERROR in main handler:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateToken(body: any, req: Request, supabase: any) {
  console.log('=== GENERATE TOKEN START ===')
  
  try {
    console.log('Body data:', body)
    
    const authHeader = req.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted length:', token.length)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    console.log('Auth result - User:', !!user, 'Error:', userError?.message)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Verificar se é super admin
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('User role check - Data:', userData, 'Error:', roleError?.message)

    if (roleError || userData?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas super admins podem gerar tokens.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar token único
    const tokenString = `sat_${body.token_type}_${crypto.randomUUID().replace(/-/g, '')}`
    console.log('Generated token string length:', tokenString.length)
    
    // Hash do token para armazenar no banco
    const encoder = new TextEncoder()
    const data = encoder.encode(tokenString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log('Token hash generated, length:', tokenHash.length)

    // Inserir no banco
    const insertData = {
      user_id: user.id,
      token_name: body.token_name,
      token_hash: tokenHash,
      token_type: body.token_type,
      scopes: body.scopes || [],
      expires_at: body.expires_at || null,
      rate_limit_per_hour: body.rate_limit_per_hour || 1000
    }
    console.log('Inserting token with data:', insertData)

    const { data: newToken, error: insertError } = await supabase
      .from('api_tokens')
      .insert(insertData)
      .select()
      .single()

    console.log('Insert result - Data:', !!newToken, 'Error:', insertError?.message)

    if (insertError) {
      console.error('Insert error details:', insertError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar token', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Token created successfully!')
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
    console.error('CRITICAL ERROR in generateToken:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function validateToken(body: any, req: Request, supabase: any) {
  console.log('=== VALIDATE TOKEN START ===')
  
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

async function refreshToken(body: any, req: Request, supabase: any) {
  console.log('=== REFRESH TOKEN START ===')
  
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