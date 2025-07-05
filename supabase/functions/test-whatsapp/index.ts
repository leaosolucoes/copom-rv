
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando teste de WhatsApp...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse request body
    const requestBody = await req.json()
    const { phoneNumber, message } = requestBody
    console.log('Dados recebidos:', { phoneNumber, message })

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber e message são obrigatórios')
    }

    // Get WhatsApp configuration with better error handling
    console.log('Buscando configurações do WhatsApp...')
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['whatsapp_api_key', 'whatsapp_api_url'])

    if (settingsError) {
      console.error('Erro ao buscar configurações:', settingsError)
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`)
    }

    console.log('Configurações encontradas:', settings)

    if (!settings || settings.length === 0) {
      throw new Error('Nenhuma configuração do WhatsApp encontrada')
    }

    const config = settings.reduce((acc: any, setting) => {
      const key = setting.key.replace('whatsapp_', '')
      acc[key] = setting.value
      return acc
    }, {})

    console.log('Config processada:', config)

    if (!config.api_key || !config.api_url) {
      throw new Error(`Configurações incompletas - API Key: ${!!config.api_key}, API URL: ${!!config.api_url}`)
    }

    // Send test message
    const whatsappPayload = {
      number: phoneNumber.replace(/\D/g, ''), // Remove non-digits
      text: message
    }

    const apiUrl = `${config.api_url}/message/sendText/${config.api_key}`
    console.log('Enviando para URL:', apiUrl)
    console.log('Payload:', whatsappPayload)

    const whatsappResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload)
    })

    console.log('Response status:', whatsappResponse.status)
    
    let whatsappResult
    try {
      whatsappResult = await whatsappResponse.json()
      console.log('Response body:', whatsappResult)
    } catch (parseError) {
      const textResult = await whatsappResponse.text()
      console.error('Erro ao fazer parse da resposta JSON:', parseError)
      console.log('Resposta como texto:', textResult)
      throw new Error(`Resposta inválida da API: ${textResult}`)
    }

    if (!whatsappResponse.ok) {
      const errorMsg = whatsappResult?.message || whatsappResult?.error || `Status: ${whatsappResponse.status}`
      throw new Error(`Erro da Evolution API (${whatsappResponse.status}): ${errorMsg}`)
    }

    console.log('Mensagem enviada com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem de teste enviada com sucesso',
        result: whatsappResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro no teste de WhatsApp:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
