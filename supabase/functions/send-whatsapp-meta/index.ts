import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { complaintId } = await req.json();

    if (!complaintId) {
      return new Response(
        JSON.stringify({ error: "complaintId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📱 Iniciando envio WhatsApp Meta para denúncia:", complaintId);

    // Buscar dados da denúncia
    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", complaintId)
      .single();

    if (complaintError || !complaint) {
      console.error("❌ Erro ao buscar denúncia:", complaintError);
      return new Response(
        JSON.stringify({ error: "Denúncia não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configurações Meta
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .like("key", "whatsapp_meta_%");

    if (settingsError) {
      console.error("❌ Erro ao buscar configurações:", settingsError);
      throw settingsError;
    }

    const config: any = {};
    settings?.forEach((setting) => {
      config[setting.key] = setting.value;
    });

    console.log("⚙️ Configurações carregadas:", Object.keys(config));

    // Verificar se envio automático está habilitado
    if (!config.whatsapp_meta_auto_send_enabled) {
      console.log("⏸️ Envio automático desabilitado");
      return new Response(
        JSON.stringify({ success: false, message: "Envio automático desabilitado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar configurações obrigatórias
    if (!config.whatsapp_meta_access_token || !config.whatsapp_meta_phone_number_id) {
      console.error("❌ Configurações incompletas");
      return new Response(
        JSON.stringify({ error: "Configurações Meta incompletas (Access Token ou Phone Number ID)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.whatsapp_meta_phone_numbers) {
      console.log("⚠️ Nenhum número configurado para receber notificações");
      return new Response(
        JSON.stringify({ success: false, message: "Nenhum número configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar mensagem
    const template = config.whatsapp_meta_message_template || 
      `🔔 NOVA DENÚNCIA\n\nProtocolo: {{protocol_number}}\nData: {{created_at}}\nDenunciante: {{complainant_name}}\nTelefone: {{complainant_phone}}\n\nLocal: {{occurrence_address}}, {{occurrence_number}}\n{{occurrence_neighborhood}} - {{occurrence_city}}/{{occurrence_state}}\n\nTipo: {{occurrence_type}}\nDescrição: {{description}}\n\nStatus: {{status}}`;

    const createdDate = new Date(complaint.created_at);
    const formattedDate = `${createdDate.toLocaleDateString("pt-BR")} ${createdDate.toLocaleTimeString("pt-BR")}`;

    const message = template
      .replace(/\{\{protocol_number\}\}/g, complaint.protocol_number || "N/A")
      .replace(/\{\{created_at\}\}/g, formattedDate)
      .replace(/\{\{complainant_name\}\}/g, complaint.complainant_name || "N/A")
      .replace(/\{\{complainant_phone\}\}/g, complaint.complainant_phone || "N/A")
      .replace(/\{\{occurrence_address\}\}/g, complaint.occurrence_address || "N/A")
      .replace(/\{\{occurrence_number\}\}/g, complaint.occurrence_number || "S/N")
      .replace(/\{\{occurrence_neighborhood\}\}/g, complaint.occurrence_neighborhood || "N/A")
      .replace(/\{\{occurrence_city\}\}/g, complaint.occurrence_city || "N/A")
      .replace(/\{\{occurrence_state\}\}/g, complaint.occurrence_state || "N/A")
      .replace(/\{\{occurrence_type\}\}/g, complaint.occurrence_type || "N/A")
      .replace(/\{\{description\}\}/g, complaint.description || "N/A")
      .replace(/\{\{status\}\}/g, complaint.status || "nova")
      .replace(/\{\{classification\}\}/g, complaint.classification || "N/A");

    console.log("📝 Mensagem formatada");

    // Preparar números
    const phoneNumbers = config.whatsapp_meta_phone_numbers
      .split(",")
      .map((num: string) => num.trim().replace(/\D/g, ""))
      .filter((num: string) => num.length >= 10);

    console.log(`📞 Enviando para ${phoneNumbers.length} número(s)`);

    const apiVersion = config.whatsapp_meta_graph_api_version || "v20.0";
    const phoneNumberId = config.whatsapp_meta_phone_number_id;
    const accessToken = config.whatsapp_meta_access_token;

    const results = [];

    // Enviar para cada número
    for (const phoneNumber of phoneNumbers) {
      try {
        console.log(`📤 Enviando para: ${phoneNumber}`);

        const response = await fetch(
          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phoneNumber,
              type: "text",
              text: {
                body: message,
              },
            }),
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          console.error(`❌ Erro ao enviar para ${phoneNumber}:`, responseData);
          results.push({
            phoneNumber,
            success: false,
            error: responseData.error?.message || "Erro desconhecido",
            errorDetails: responseData,
          });
        } else {
          console.log(`✅ Enviado com sucesso para ${phoneNumber}. Message ID:`, responseData.messages?.[0]?.id);
          results.push({
            phoneNumber,
            success: true,
            messageId: responseData.messages?.[0]?.id,
          });
        }
      } catch (error: any) {
        console.error(`❌ Erro de rede ao enviar para ${phoneNumber}:`, error);
        results.push({
          phoneNumber,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`✅ Resultado: ${successCount}/${phoneNumbers.length} enviados com sucesso`);

    // Atualizar denúncia se pelo menos um envio foi bem-sucedido
    if (successCount > 0) {
      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
        })
        .eq("id", complaintId);

      if (updateError) {
        console.error("❌ Erro ao atualizar denúncia:", updateError);
      } else {
        console.log("✅ Denúncia atualizada com sucesso");
      }
    }

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Enviado para ${successCount} de ${phoneNumbers.length} números`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
