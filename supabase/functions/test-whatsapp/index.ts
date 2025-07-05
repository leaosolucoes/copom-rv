
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

    const { phoneNumber, message } = await req.json()
    console.log('Teste de WhatsApp para:', phoneNumber)

    // Get WhatsApp configuration
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['whatsapp_api_key', 'whatsapp_api_url'])

    if (settingsError) {
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`)
    }

    const config = settings.reduce((acc: any, setting) => {
      const key = setting.key.replace('whatsapp_', '')
      acc[key] = setting.value
      return acc
    }, {})

    if (!config.api_key || !config.api_url) {
      throw new Error('Configurações do WhatsApp incompletas')
    }

    // Send test message
    const whatsappPayload = {
      number: phoneNumber,
      text: message
    }

    const whatsappResponse = await fetch(`${config.api_url}/message/sendText/${config.api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload)
    })

    const whatsappResult = await whatsappResponse.json()

    if (!whatsappResponse.ok) {
      throw new Error(`Erro da Evolution API: ${whatsappResult.message || 'Erro desconhecido'}`)
    }

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
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
