import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Buscar configurações do webhook
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["whatsapp_meta_webhook_verify_token", "whatsapp_meta_webhook_secret"]);

    const config: any = {};
    settings?.forEach((setting) => {
      config[setting.key] = setting.value;
    });

    // WEBHOOK VERIFICATION (GET) - Quando a Meta valida o webhook
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("🔐 Verificação de webhook recebida");
      console.log("Mode:", mode);
      console.log("Token recebido:", token);
      console.log("Token esperado:", config.whatsapp_meta_webhook_verify_token);

      if (mode === "subscribe" && token === config.whatsapp_meta_webhook_verify_token) {
        console.log("✅ Webhook verificado com sucesso");
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        console.error("❌ Token de verificação inválido");
        return new Response("Forbidden", { status: 403 });
      }
    }

    // WEBHOOK EVENTS (POST) - Quando a Meta envia notificações
    if (req.method === "POST") {
      // Validar assinatura do webhook (opcional mas recomendado)
      const signature = req.headers.get("x-hub-signature-256");
      const rawBody = await req.text();

      if (config.whatsapp_meta_webhook_secret && signature) {
        const expectedSignature = "sha256=" + 
          createHmac("sha256", config.whatsapp_meta_webhook_secret)
            .update(rawBody)
            .digest("hex");

        if (signature !== expectedSignature) {
          console.error("❌ Assinatura do webhook inválida");
          return new Response("Forbidden", { status: 403 });
        }
      }

      const body = JSON.parse(rawBody);
      console.log("📬 Webhook recebido:", JSON.stringify(body, null, 2));

      // Processar eventos
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;

            // Processar status de mensagens
            if (value.statuses) {
              for (const status of value.statuses) {
                console.log(`📊 Status da mensagem ${status.id}: ${status.status}`);
                console.log(`Timestamp: ${status.timestamp}`);
                
                if (status.errors) {
                  console.error("❌ Erro na mensagem:", status.errors);
                }

                // Aqui você pode salvar o status em uma tabela de logs
                // ou atualizar o status da denúncia conforme necessário
              }
            }

            // Processar mensagens recebidas (respostas)
            if (value.messages) {
              for (const message of value.messages) {
                console.log(`💬 Mensagem recebida de ${message.from}: ${message.text?.body}`);
                
                // Aqui você pode processar respostas dos usuários
                // Por exemplo, criar uma tabela de interações
              }
            }
          }
        }
      }

      // A Meta espera uma resposta 200 OK rapidamente
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error);
    // Mesmo com erro, retornar 200 para a Meta não retentar indefinidamente
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
