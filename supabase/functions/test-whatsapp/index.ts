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
    const { phoneNumber, phoneNumbers, message } = await req.json()
    
    // Suportar tanto formato singular quanto múltiplo
    let numbersToTest = []
    if (phoneNumbers && Array.isArray(phoneNumbers)) {
      numbersToTest = phoneNumbers
    } else if (phoneNumber) {
      numbersToTest = [phoneNumber]
    }
    
    console.log('📞 Dados:', { 
      numbersCount: numbersToTest.length,
      messageLength: message?.length || 0 
    })

    if (numbersToTest.length === 0 || !message) {
      throw new Error('phoneNumbers/phoneNumber e message são obrigatórios')
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
      .replace(/\{description\}/g, 'Esta é uma mensagem de teste do sistema de posturas de Rio Verde para verificar a integração com WhatsApp.')

    console.log('📝 Mensagem de teste preparada (100 primeiros chars):', testMessage.substring(0, 100))

    const apiUrl = `${config.api_url.replace(/\/$/, '')}/message/sendText/${config.instance_name}`
    console.log('🌐 URL completa:', apiUrl)

    // 5. Send to WhatsApp API for all numbers
    console.log('5. Enviando para Evolution API para todos os números...')
    
    const results = []
    let successCount = 0
    
    for (let i = 0; i < numbersToTest.length; i++) {
      const phoneNumber = numbersToTest[i]
      console.log(`📱 Processando número ${i + 1}/${numbersToTest.length}: ${phoneNumber}`)
      
      try {
        const cleanPhone = phoneNumber.replace(/\D/g, '')
        console.log('📱 Número limpo:', cleanPhone)

        const whatsappPayload = {
          number: cleanPhone + '@c.us',
          text: testMessage
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.api_key
          },
          body: JSON.stringify(whatsappPayload)
        })

        console.log(`📡 Status response para ${cleanPhone}:`, response.status)
        
        const responseText = await response.text()
        console.log(`📄 Response text para ${cleanPhone}:`, responseText)

        let result
        try {
          result = JSON.parse(responseText)
        } catch (e) {
          console.error(`❌ Parse error para ${cleanPhone}:`, e)
          throw new Error(`Resposta inválida da API: ${responseText.substring(0, 100)}`)
        }

        console.log(`📊 Resultado para ${cleanPhone}:`, result)

        if (response.ok) {
          console.log(`✅ Mensagem enviada para ${cleanPhone}!`)
          successCount++
          results.push({
            phoneNumber: cleanPhone,
            success: true,
            status: response.status,
            result: result
          })
        } else {
          console.error(`❌ Response not OK para ${cleanPhone}:`, response.status, result)
          results.push({
            phoneNumber: cleanPhone,
            success: false,
            status: response.status,
            error: result?.message || result?.error || 'Erro desconhecido'
          })
        }
      } catch (error) {
        console.error(`❌ Erro para número ${phoneNumber}:`, error instanceof Error ? error.message : 'Erro desconhecido')
        results.push({
          phoneNumber: phoneNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    // Success summary
    console.log(`📊 Resumo: ${successCount}/${numbersToTest.length} mensagens enviadas com sucesso`)
    console.log('=== FIM TESTE WHATSAPP ===')

    const allSuccess = successCount === numbersToTest.length
    const partialSuccess = successCount > 0 && successCount < numbersToTest.length

    return new Response(
      JSON.stringify({ 
        success: allSuccess,
        partial: partialSuccess,
        message: allSuccess 
          ? `Mensagem enviada com sucesso para todos os ${successCount} números!`
          : partialSuccess 
            ? `Mensagem enviada para ${successCount} de ${numbersToTest.length} números`
            : 'Falha ao enviar para todos os números',
        details: {
          totalNumbers: numbersToTest.length,
          successCount: successCount,
          failedCount: numbersToTest.length - successCount,
          results: results
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: allSuccess ? 200 : (partialSuccess ? 206 : 400)
      }
    )

  } catch (error) {
    console.error('=== ERRO TESTE WHATSAPP ===')
    console.error('❌ Error:', error instanceof Error ? error.message : 'Erro desconhecido')
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'Stack não disponível')
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})