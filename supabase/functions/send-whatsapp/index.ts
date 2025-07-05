
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
      '{occurrence_type}': complaint.occurrence_type,
      '{occurrence_address}': complaint.occurrence_address,
      '{occurrence_neighborhood}': complaint.occurrence_neighborhood,
      '{occurrence_date}': new Date(complaint.occurrence_date).toLocaleDateString('pt-BR'),
      '{occurrence_time}': complaint.occurrence_time,
      '{classification}': complaint.classification,
      '{narrative}': complaint.narrative
    }

    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(key, 'g'), value || '')
    }

    // Send WhatsApp message
    const whatsappPayload = {
      number: config.phone_number,
      text: message
    }

    console.log('Enviando mensagem para:', config.phone_number)
    console.log('Payload:', whatsappPayload)

    const whatsappResponse = await fetch(`${config.api_url}/message/sendText/${config.api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload)
    })

    const whatsappResult = await whatsappResponse.json()
    console.log('Resposta da Evolution API:', whatsappResult)

    if (!whatsappResponse.ok) {
      throw new Error(`Erro da Evolution API: ${whatsappResult.message || 'Erro desconhecido'}`)
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
        message: 'Mensagem enviada com sucesso',
        whatsappResult 
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
