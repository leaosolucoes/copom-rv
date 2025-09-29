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

  console.log('=== SEND WHATSAPP FUNCTION INICIADA ===')
  console.log('Method:', req.method)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse request body
    let body
    try {
      body = await req.json()
      console.log('Request body:', body)
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError)
      throw new Error('Request body inválido')
    }

    const { complaintId } = body
    if (!complaintId) {
      console.error('complaintId não fornecido')
      throw new Error('complaintId é obrigatório')
    }

    console.log('=== INICIANDO PROCESSAMENTO ===')
    console.log('Complaint ID:', complaintId)
    console.log('Timestamp:', new Date().toISOString())

    // Get complaint details
    console.log('Buscando denúncia...')
    const { data: complaint, error: complaintError } = await supabaseClient
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single()

    if (complaintError) {
      console.error('Erro ao buscar denúncia:', complaintError)
      throw new Error(`Erro ao buscar denúncia: ${complaintError.message}`)
    }

    if (!complaint) {
      console.error('Denúncia não encontrada')
      throw new Error('Denúncia não encontrada')
    }

    console.log('Denúncia encontrada:', complaint.complainant_name)

    // Get WhatsApp configuration
    console.log('Buscando configurações do WhatsApp...')
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'whatsapp_api_key',
        'whatsapp_api_url', 
        'whatsapp_instance_name',
        'whatsapp_phone_number',
        'whatsapp_message_template',
        'whatsapp_auto_send_enabled'
      ])

    if (settingsError) {
      console.error('Erro ao buscar configurações:', settingsError)
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`)
    }

    console.log('Configurações encontradas:', settings?.length || 0)

    const config = settings.reduce((acc: any, setting) => {
      const key = setting.key.replace('whatsapp_', '')
      acc[key] = setting.value
      return acc
    }, {})

    console.log('Config processado:', {
      api_key: config.api_key ? '[PRESENTE]' : '[AUSENTE]',
      api_url: config.api_url || '[AUSENTE]',
      instance_name: config.instance_name || '[AUSENTE]',
      phone_number: config.phone_number || '[AUSENTE]',
      auto_send_enabled: config.auto_send_enabled
    })

    // Verificar configurações obrigatórias
    if (!config.api_key || !config.api_url || !config.phone_number) {
      const missing = []
      if (!config.api_key) missing.push('api_key')
      if (!config.api_url) missing.push('api_url') 
      if (!config.phone_number) missing.push('phone_number')
      
      console.error('Configurações incompletas:', missing)
      throw new Error(`Configurações incompletas: ${missing.join(', ')}`)
    }

    if (!config.auto_send_enabled) {
      console.log('Envio automático desabilitado')
      return new Response(
        JSON.stringify({ success: false, message: 'Envio automático desabilitado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format message
    let message = config.message_template || 'Nova denúncia recebida de {complainant_name}'
    
    const replacements = {
      '{complainant_name}': complaint.complainant_name || '',
      '{complainant_phone}': complaint.complainant_phone || '',
      '{complainant_type}': complaint.complainant_type || '',
      '{complainant_address}': complaint.complainant_address || '',
      '{complainant_number}': complaint.complainant_number || 'S/N',
      '{complainant_block}': complaint.complainant_block || 'S/N',
      '{complainant_lot}': complaint.complainant_lot || 'S/N',
      '{complainant_neighborhood}': complaint.complainant_neighborhood || '',
      '{occurrence_type}': complaint.occurrence_type || '',
      '{occurrence_address}': complaint.occurrence_address || '',
      '{occurrence_number}': complaint.occurrence_number || 'S/N',
      '{occurrence_block}': complaint.occurrence_block || 'S/N',
      '{occurrence_lot}': complaint.occurrence_lot || 'S/N',
      '{occurrence_neighborhood}': complaint.occurrence_neighborhood || '',
      '{occurrence_reference}': complaint.occurrence_reference || 'Não informado',
      '{occurrence_date}': complaint.occurrence_date ? new Date(complaint.occurrence_date).toLocaleDateString('pt-BR') : 'Não informado',
      '{occurrence_time}': complaint.occurrence_time || 'Não informado',
      '{classification}': complaint.classification || 'Não informado',
      '{assigned_to}': complaint.assigned_to || 'Não atribuído',
      '{narrative}': complaint.narrative || ''
    }

    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(key, 'g'), value)
    }

    console.log('Mensagem formatada (primeiros 100 chars):', message.substring(0, 100) + '...')

    // Process phone numbers
    const phoneNumbers = config.phone_number.split(',').map((num: string) => num.trim()).filter((num: string) => num.length > 0)
    console.log('Números para enviar:', phoneNumbers)

    const results = []
    
    // Send to each phone number
    for (const phoneNumber of phoneNumbers) {
      console.log(`Enviando para: ${phoneNumber}`)
      
      try {
        const whatsappPayload = {
          number: phoneNumber,
          text: message
        }

        // Evolution API endpoint
        const evolutionUrl = `${config.api_url}/message/sendText/${config.instance_name}`
        console.log('URL da Evolution:', evolutionUrl)
        
        const whatsappResponse = await fetch(evolutionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.api_key
          },
          body: JSON.stringify(whatsappPayload)
        })

        const whatsappResult = await whatsappResponse.json()
        console.log(`Resposta para ${phoneNumber}:`, whatsappResult)

        results.push({
          phoneNumber,
          success: whatsappResponse.ok,
          status: whatsappResponse.status,
          result: whatsappResult
        })

      } catch (error) {
        console.error(`Erro ao enviar para ${phoneNumber}:`, error)
        results.push({
          phoneNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`Resultado final: ${successCount}/${phoneNumbers.length} enviados com sucesso`)

    if (successCount === 0) {
      throw new Error('Falha ao enviar para todos os números')
    }

    // Update complaint to mark WhatsApp as sent
    console.log('Atualizando status whatsapp_sent para true...')
    const { error: updateError } = await supabaseClient
      .from('complaints')
      .update({ whatsapp_sent: true })
      .eq('id', complaintId)

    if (updateError) {
      console.error('Erro ao atualizar status WhatsApp:', updateError)
    } else {
      console.log('Status WhatsApp atualizado com sucesso')
    }

    console.log('=== PROCESSAMENTO CONCLUÍDO COM SUCESSO ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Mensagem enviada para ${successCount} de ${phoneNumbers.length} números`,
        results,
        successCount,
        totalNumbers: phoneNumbers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ERRO NO PROCESSAMENTO ===')
    console.error('Erro:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'Stack não disponível')
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})