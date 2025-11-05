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

    const { phoneNumbers, message } = await req.json();

    console.log("🧪 Teste WhatsApp Meta iniciado");
    console.log("📞 Números:", phoneNumbers);

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

    console.log("⚙️ Configurações carregadas");

    // Validar configurações obrigatórias
    if (!config.whatsapp_meta_access_token || !config.whatsapp_meta_phone_number_id) {
      console.error("❌ Configurações incompletas");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Configurações Meta incompletas. Verifique Access Token e Phone Number ID." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar números
    const numbers = phoneNumbers
      .split(",")
      .map((num: string) => num.trim().replace(/\D/g, ""))
      .filter((num: string) => num.length >= 10);

    if (numbers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Nenhum número válido fornecido" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📤 Enviando teste para ${numbers.length} número(s)`);

    const apiVersion = config.whatsapp_meta_graph_api_version || "v20.0";
    const phoneNumberId = config.whatsapp_meta_phone_number_id;
    const accessToken = config.whatsapp_meta_access_token;

    const testMessage = message || "🧪 Teste de integração WhatsApp Meta API - Sistema de Denúncias";

    const results = [];

    // Enviar para cada número
    for (const phoneNumber of numbers) {
      try {
        console.log(`📤 Enviando teste para: ${phoneNumber}`);

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
                body: testMessage,
              },
            }),
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          console.error(`❌ Erro ao enviar para ${phoneNumber}:`, responseData);
          
          let errorMessage = "Erro desconhecido";
          if (responseData.error?.message) {
            errorMessage = responseData.error.message;
          } else if (responseData.error?.error_user_msg) {
            errorMessage = responseData.error.error_user_msg;
          }

          results.push({
            phoneNumber,
            success: false,
            error: errorMessage,
            errorCode: responseData.error?.code,
            errorType: responseData.error?.type,
          });
        } else {
          console.log(`✅ Teste enviado com sucesso para ${phoneNumber}`);
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
          error: `Erro de conexão: ${error.message}`,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`✅ Resultado do teste: ${successCount}/${numbers.length} enviados com sucesso`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Teste concluído: ${successCount} de ${numbers.length} enviados`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro geral no teste:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
