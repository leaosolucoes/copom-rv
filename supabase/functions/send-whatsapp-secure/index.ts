import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  complaintId: string;
  phoneNumber?: string;
  customMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get secrets from Supabase Edge Function environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY')
    const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    if (!whatsappApiKey || !whatsappApiUrl) {
      console.error('WhatsApp API not configured')
      return new Response(
        JSON.stringify({ 
          error: 'WhatsApp API not configured',
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { complaintId, phoneNumber, customMessage }: WhatsAppMessage = await req.json()

    if (!complaintId) {
      return new Response(
        JSON.stringify({ error: 'Missing complaint ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing WhatsApp notification for complaint: ${complaintId}`)

    // Get complaint details
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single()

    if (complaintError || !complaint) {
      console.error('Error fetching complaint:', complaintError)
      return new Response(
        JSON.stringify({ error: 'Complaint not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get WhatsApp configuration from system settings
    const { data: whatsappConfig, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'whatsapp_config')
      .single()

    let whatsappSettings = {
      enabled: true,
      default_phone: '5562999999999', // Default fallback
      message_template: 'Nova denúncia registrada: {{system_identifier}}'
    }

    if (!configError && whatsappConfig?.value) {
      whatsappSettings = { ...whatsappSettings, ...whatsappConfig.value }
    }

    if (!whatsappSettings.enabled) {
      console.log('WhatsApp notifications are disabled')
      return new Response(
        JSON.stringify({ success: true, message: 'WhatsApp disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare message
    const targetPhone = phoneNumber || whatsappSettings.default_phone
    const message = customMessage || whatsappSettings.message_template
      .replace('{{system_identifier}}', complaint.system_identifier || complaint.id)
      .replace('{{occurrence_type}}', complaint.occurrence_type)
      .replace('{{occurrence_address}}', complaint.occurrence_address)
      .replace('{{complainant_name}}', complaint.complainant_name)

    // Send WhatsApp message using configured API
    const whatsappResponse = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappApiKey}`,
      },
      body: JSON.stringify({
        phone: targetPhone,
        message: message,
        complaint_id: complaintId
      })
    })

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text()
      console.error('WhatsApp API error:', errorText)
      
      // Update complaint with failure status
      await supabase
        .from('complaints')
        .update({ whatsapp_sent: false })
        .eq('id', complaintId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp message',
          details: errorText,
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update complaint with success status
    await supabase
      .from('complaints')
      .update({ whatsapp_sent: true })
      .eq('id', complaintId)

    console.log(`WhatsApp notification sent successfully for complaint: ${complaintId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp notification sent successfully',
        complaint_id: complaintId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-whatsapp-secure function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})