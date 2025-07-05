import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== INÍCIO TESTE WHATSAPP ===', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase
    console.log('1. Inicializando Supabase...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 2. Parse request
    console.log('2. Fazendo parse da requisição...')
    const { phoneNumber, message } = await req.json()
    console.log('📞 Dados:', { 
      phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
      messageLength: message?.length || 0 
    })

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber e message são obrigatórios')
    }

    // 3. Get WhatsApp settings
    console.log('3. Buscando configurações...')
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['whatsapp_api_key', 'whatsapp_api_url', 'whatsapp_instance_name', 'whatsapp_message_template'])

    if (settingsError) {
      console.error('❌ Erro settings:', settingsError)
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`)
    }

    console.log('📋 Settings encontradas:', settings?.length || 0)

    if (!settings || settings.length === 0) {
      throw new Error('Configurações não encontradas. Salve as configurações primeiro.')
    }

    const config = settings.reduce((acc: any, setting) => {
      const key = setting.key.replace('whatsapp_', '')
      acc[key] = setting.value
      return acc
    }, {})

    console.log('⚙️ Config:', {
      hasApiKey: !!config.api_key,
      hasApiUrl: !!config.api_url,  
      hasInstanceName: !!config.instance_name,
      hasMessageTemplate: !!config.message_template,
      apiUrl: config.api_url
    })

    if (!config.api_key || !config.api_url || !config.instance_name) {
      throw new Error('Configurações incompletas. Verifique API Key, URL e Nome da Instância.')
    }

    // 4. Prepare test message using template
    console.log('4. Preparando mensagem de teste com template...')
    
    let testMessage = config.message_template || `🚨 *TESTE - NOVA DENÚNCIA REGISTRADA*

📋 *Sistema de Posturas - Rio Verde*

👤 *DENUNCIANTE:*
• Nome: João da Silva (TESTE)
• Telefone: (62) 99999-9999
• Tipo: Pessoa Física

📍 *LOCAL DA OCORRÊNCIA:*
• Endereço: Rua das Flores, 123
• Bairro: Centro
• Data: ${new Date().toLocaleDateString('pt-BR')}
• Horário: ${new Date().toLocaleTimeString('pt-BR')}

⚠️ *TIPO DE OCORRÊNCIA:*
Teste de Integração WhatsApp

📝 *RELATO:*
Esta é uma mensagem de teste do sistema de posturas de Rio Verde para verificar a integração com WhatsApp.

🏛️ *Secretaria Municipal de Posturas*
_Este é um teste - sistema funcionando corretamente!_`

    // Replace template variables with test data
    testMessage = testMessage
      .replace(/\{complainant_name\}/g, 'João da Silva (TESTE)')
      .replace(/\{complainant_phone\}/g, '(62) 99999-9999')
      .replace(/\{complainant_type\}/g, 'Pessoa Física')
      .replace(/\{occurrence_address\}/g, 'Rua das Flores, 123')
      .replace(/\{occurrence_neighborhood\}/g, 'Centro')
      .replace(/\{occurrence_date\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{occurrence_time\}/g, new Date().toLocaleTimeString('pt-BR'))
      .replace(/\{occurrence_type\}/g, 'Teste de Integração WhatsApp')
      .replace(/\{narrative\}/g, 'Esta é uma mensagem de teste do sistema de posturas de Rio Verde para verificar a integração com WhatsApp.')

    console.log('📝 Mensagem de teste preparada (100 primeiros chars):', testMessage.substring(0, 100))

    const cleanPhone = phoneNumber.replace(/\D/g, '')
    console.log('📱 Número limpo:', cleanPhone)

    const whatsappPayload = {
      number: cleanPhone + '@c.us',
      text: testMessage
    }

    const apiUrl = `${config.api_url.replace(/\/$/, '')}/message/sendText/${config.instance_name}`
    console.log('🌐 URL completa:', apiUrl)

    // 5. Send to WhatsApp API
    console.log('5. Enviando para Evolution API...')
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key
      },
      body: JSON.stringify(whatsappPayload)
    })

    console.log('📡 Status response:', response.status)
    
    const responseText = await response.text()
    console.log('📄 Response text:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Parse error:', e)
      throw new Error(`Resposta inválida da API: ${responseText.substring(0, 100)}`)
    }

    console.log('📊 Resultado completo:', result)

    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, result)
      throw new Error(`Erro da Evolution API (${response.status}): ${result?.message || result?.error || 'Erro desconhecido'}`)
    }

    // Success
    console.log('✅ Mensagem enviada!')
    console.log('=== FIM TESTE WHATSAPP - SUCESSO ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso!',
        details: {
          to: cleanPhone,
          status: response.status,
          evolutionResponse: result
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('=== ERRO TESTE WHATSAPP ===')
    console.error('❌ Error:', error.message)
    console.error('❌ Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})