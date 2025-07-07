
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { complaintId } = await req.json()
    console.log('Enviando WhatsApp para denúncia:', complaintId)

    // Get complaint details
    const { data: complaint, error: complaintError } = await supabaseClient
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single()

    if (complaintError) {
      throw new Error(`Erro ao buscar denúncia: ${complaintError.message}`)
    }

    // Get WhatsApp configuration
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'whatsapp_api_key',
        'whatsapp_api_url',
        'whatsapp_instance_name',
        'whatsapp_phone_number',
        'whatsapp_message_template',
        'whatsapp_send_full_complaint',
        'whatsapp_auto_send_enabled'
      ])

    if (settingsError) {
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`)
    }

    const config = settings.reduce((acc: any, setting) => {
      const key = setting.key.replace('whatsapp_', '')
      acc[key] = setting.value
      return acc
    }, {})

    if (!config.api_key || !config.api_url || !config.phone_number) {
      throw new Error('Configurações do WhatsApp incompletas')
    }

    if (!config.auto_send_enabled) {
      console.log('Envio automático desabilitado')
      return new Response(
        JSON.stringify({ success: false, message: 'Envio automático desabilitado' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Format message
    let message = config.message_template || 'Nova denúncia recebida'
    
    const replacements = {
      '{complainant_name}': complaint.complainant_name,
      '{complainant_phone}': complaint.complainant_phone,
      '{complainant_type}': complaint.complainant_type,
      '{complainant_address}': complaint.complainant_address,
      '{complainant_number}': complaint.complainant_number || 'Não informado',
      '{complainant_block}': complaint.complainant_block || 'Não informado',
      '{complainant_lot}': complaint.complainant_lot || 'Não informado',
      '{complainant_neighborhood}': complaint.complainant_neighborhood,
      '{occurrence_type}': complaint.occurrence_type,
      '{occurrence_address}': complaint.occurrence_address,
      '{occurrence_number}': complaint.occurrence_number || 'Não informado',
      '{occurrence_block}': complaint.occurrence_block || 'Não informado',
      '{occurrence_lot}': complaint.occurrence_lot || 'Não informado',
      '{occurrence_neighborhood}': complaint.occurrence_neighborhood,
      '{occurrence_reference}': complaint.occurrence_reference || 'Não informado',
      '{occurrence_date}': complaint.occurrence_date ? new Date(complaint.occurrence_date).toLocaleDateString('pt-BR') : 'Não informado',
      '{occurrence_time}': complaint.occurrence_time || 'Não informado',
      '{classification}': complaint.classification || 'Não informado',
      '{assigned_to}': complaint.assigned_to || 'Não atribuído',
      '{narrative}': complaint.narrative
    }

    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(key, 'g'), value || '')
    }

    // Process multiple phone numbers separated by comma
    const phoneNumbers = config.phone_number.split(',').map(num => num.trim()).filter(num => num.length > 0)
    console.log('Enviando mensagem para números:', phoneNumbers)

    const results = []
    
    // Send to each phone number
    for (const phoneNumber of phoneNumbers) {
      try {
        const whatsappPayload = {
          number: phoneNumber,
          text: message
        }

        console.log('Enviando mensagem para:', phoneNumber)
        console.log('Payload:', whatsappPayload)

        // Evolution API endpoint format: /message/sendText/{instance_name}
        const evolutionUrl = `${config.api_url}/message/sendText/${config.instance_name}`
        
        const whatsappResponse = await fetch(evolutionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.api_key
          },
          body: JSON.stringify(whatsappPayload)
        })

        const whatsappResult = await whatsappResponse.json()
        console.log(`Resposta da Evolution API para ${phoneNumber}:`, whatsappResult)

        results.push({
          phoneNumber,
          success: whatsappResponse.ok,
          result: whatsappResult
        })

        if (!whatsappResponse.ok) {
          console.error(`Erro ao enviar para ${phoneNumber}:`, whatsappResult.message || 'Erro desconhecido')
        }
      } catch (error) {
        console.error(`Erro ao enviar para ${phoneNumber}:`, error)
        results.push({
          phoneNumber,
          success: false,
          error: error.message
        })
      }
    }

    // Check if at least one message was sent successfully
    const successCount = results.filter(r => r.success).length
    if (successCount === 0) {
      throw new Error(`Falha ao enviar para todos os números: ${results.map(r => `${r.phoneNumber}: ${r.error || 'Erro desconhecido'}`).join(', ')}`)
    }

    // Update complaint to mark WhatsApp as sent
    const { error: updateError } = await supabaseClient
      .from('complaints')
      .update({ whatsapp_sent: true })
      .eq('id', complaintId)

    if (updateError) {
      console.error('Erro ao atualizar status do WhatsApp:', updateError)
    }

    console.log('WhatsApp enviado com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Mensagem enviada com sucesso para ${successCount} de ${phoneNumbers.length} números`,
        results,
        successCount,
        totalNumbers: phoneNumbers.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
