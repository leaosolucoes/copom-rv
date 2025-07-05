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

  console.log('=== INÍCIO DO TESTE WHATSAPP ===')
  
  try {
    // Step 1: Initialize Supabase client
    console.log('1. Inicializando cliente Supabase...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Cliente Supabase inicializado')

    // Step 2: Parse request body
    console.log('2. Processando dados da requisição...')
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError)
      throw new Error('Dados da requisição inválidos')
    }
    
    const { phoneNumber, message, instanceName } = requestBody
    console.log('📞 Dados recebidos:', { 
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}****${phoneNumber.substring(phoneNumber.length - 4)}` : 'undefined',
      messageLength: message ? message.length : 0,
      instanceName: instanceName || 'não informado'
    })

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber e message são obrigatórios')
    }

    // Step 3: Get WhatsApp configuration
    console.log('3. Buscando configurações do WhatsApp...')
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['whatsapp_api_key', 'whatsapp_api_url', 'whatsapp_instance_name'])

    if (settingsError) {
      console.error('❌ Erro ao buscar configurações:', settingsError)
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`)
    }

    console.log('📋 Configurações encontradas:', settings?.length || 0, 'itens')

    if (!settings || settings.length === 0) {
      throw new Error('❌ Nenhuma configuração do WhatsApp encontrada. Verifique se as configurações foram salvas.')
    }

    const config = settings.reduce((acc: any, setting) => {
      const key = setting.key.replace('whatsapp_', '')
      acc[key] = setting.value
      return acc
    }, {})

    console.log('⚙️ Config processada:', {
      hasApiKey: !!config.api_key,
      hasApiUrl: !!config.api_url,
      hasInstanceName: !!config.instance_name,
      apiUrlPreview: config.api_url ? config.api_url.substring(0, 30) + '...' : 'undefined'
    })

    if (!config.api_key || !config.api_url || !config.instance_name) {
      throw new Error(`❌ Configurações incompletas - API Key: ${!!config.api_key}, API URL: ${!!config.api_url}, Instance Name: ${!!config.instance_name}`)
    }

    // Step 4: Prepare WhatsApp payload
    console.log('4. Preparando payload para WhatsApp...')
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '')
    
    // Payload for Evolution API
    const whatsappPayload = {
      number: cleanPhoneNumber,
      text: message
    }

    // Correct URL format for Evolution API
    const baseUrl = config.api_url.replace(/\/$/, '')
    const instanceName = config.instance_name
    const apiUrl = `${baseUrl}/message/sendText/${instanceName}`
    
    console.log('🌐 URL da API:', apiUrl)
    console.log('📤 Payload:', { number: cleanPhoneNumber, textLength: message.length })

    // Step 5: Send to WhatsApp API with correct headers
    console.log('5. Enviando mensagem para Evolution API...')
    const whatsappResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key
      },
      body: JSON.stringify(whatsappPayload)
    })

    console.log('📡 Response status:', whatsappResponse.status, whatsappResponse.statusText)
    
    let whatsappResult
    const responseText = await whatsappResponse.text()
    console.log('📄 Response text (primeiros 200 chars):', responseText.substring(0, 200))
    
    try {
      whatsappResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError)
      
      // Se não conseguir fazer parse, retorna erro mas com mais informações
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resposta inválida da Evolution API (${whatsappResponse.status}): ${responseText.substring(0, 100)}`,
          timestamp: new Date().toISOString(),
          debug: {
            status: whatsappResponse.status,
            url: apiUrl.replace(config.api_key, '***'),
            responsePreview: responseText.substring(0, 100)
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    if (!whatsappResponse.ok) {
      const errorMsg = whatsappResult?.message || whatsappResult?.error || whatsappResult?.description || `Status: ${whatsappResponse.status}`
      console.error('❌ Erro da Evolution API:', errorMsg)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro da Evolution API (${whatsappResponse.status}): ${errorMsg}`,
          timestamp: new Date().toISOString(),
          debug: {
            status: whatsappResponse.status,
            response: whatsappResult
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log('✅ Mensagem enviada com sucesso!')
    console.log('📊 Resultado:', whatsappResult)
    console.log('=== FIM DO TESTE WHATSAPP - SUCESSO ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem de teste enviada com sucesso!',
        result: whatsappResult,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('=== ERRO NO TESTE WHATSAPP ===')
    console.error('❌ Erro:', error.message)
    console.error('❌ Stack:', error.stack)
    console.log('=== FIM DO TESTE WHATSAPP - ERRO ===')
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString(),
        debug: {
          errorType: error.name,
          errorStack: error.stack?.split('\n')[0]
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})