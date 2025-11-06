import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Complaint {
  id: string;
  occurrence_type: string;
  created_at: string;
}

interface AlertSettings {
  enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  email_recipients: string[];
  whatsapp_recipients: string[];
  thresholds: {
    hourly_increase_percent: number;
    daily_increase_percent: number;
    unusual_hour_threshold: number;
    unusual_hour_min: number;
    unusual_hour_max: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações
    const { data: settings } = await supabase
      .from("alert_settings")
      .select("*")
      .single();

    if (!settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ message: "Alertas desabilitados" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alertSettings = settings as AlertSettings;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Buscar denúncias recentes
    const { data: recentComplaints } = await supabase
      .from("complaints")
      .select("id, occurrence_type, created_at")
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!recentComplaints || recentComplaints.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma denúncia recente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const complaints = recentComplaints as Complaint[];
    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      details: any;
    }> = [];

    // 1. Verificar aumento súbito na última hora
    const lastHourCount = complaints.filter(
      c => new Date(c.created_at) >= oneHourAgo
    ).length;
    const previousHourCount = complaints.filter(
      c => new Date(c.created_at) >= twoHoursAgo && new Date(c.created_at) < oneHourAgo
    ).length;

    if (previousHourCount > 0) {
      const increasePercent = ((lastHourCount - previousHourCount) / previousHourCount) * 100;
      if (increasePercent >= alertSettings.thresholds.hourly_increase_percent) {
        alerts.push({
          type: "hourly_spike",
          severity: "high",
          message: `Aumento súbito de ${Math.round(increasePercent)}% nas denúncias na última hora`,
          details: {
            previous_hour: previousHourCount,
            last_hour: lastHourCount,
            increase_percent: Math.round(increasePercent),
          },
        });
      }
    }

    // 2. Verificar aumento diário
    const lastDayCount = complaints.filter(
      c => new Date(c.created_at) >= oneDayAgo
    ).length;
    const previousDayCount = complaints.filter(
      c => new Date(c.created_at) >= twoDaysAgo && new Date(c.created_at) < oneDayAgo
    ).length;

    if (previousDayCount > 0) {
      const dailyIncreasePercent = ((lastDayCount - previousDayCount) / previousDayCount) * 100;
      if (dailyIncreasePercent >= alertSettings.thresholds.daily_increase_percent) {
        alerts.push({
          type: "daily_spike",
          severity: "medium",
          message: `Aumento de ${Math.round(dailyIncreasePercent)}% nas denúncias nas últimas 24h`,
          details: {
            previous_day: previousDayCount,
            last_day: lastDayCount,
            increase_percent: Math.round(dailyIncreasePercent),
          },
        });
      }
    }

    // 3. Verificar atividade em horário atípico (madrugada)
    const currentHour = now.getHours();
    const isUnusualHour = currentHour >= alertSettings.thresholds.unusual_hour_min && 
                          currentHour <= alertSettings.thresholds.unusual_hour_max;
    
    if (isUnusualHour) {
      const unusualHourComplaints = complaints.filter(c => {
        const hour = new Date(c.created_at).getHours();
        return hour >= alertSettings.thresholds.unusual_hour_min && 
               hour <= alertSettings.thresholds.unusual_hour_max &&
               new Date(c.created_at) >= oneHourAgo;
      });

      if (unusualHourComplaints.length >= alertSettings.thresholds.unusual_hour_threshold) {
        alerts.push({
          type: "unusual_hour",
          severity: "high",
          message: `${unusualHourComplaints.length} denúncias em horário atípico (${currentHour}h)`,
          details: {
            hour: currentHour,
            count: unusualHourComplaints.length,
            types: [...new Set(unusualHourComplaints.map(c => c.occurrence_type))],
          },
        });
      }
    }

    // 4. Verificar pico de tipo específico
    const typeCount = new Map<string, number>();
    complaints
      .filter(c => new Date(c.created_at) >= oneHourAgo)
      .forEach(c => {
        typeCount.set(c.occurrence_type, (typeCount.get(c.occurrence_type) || 0) + 1);
      });

    typeCount.forEach((count, type) => {
      if (count >= 5) {
        alerts.push({
          type: "type_concentration",
          severity: "medium",
          message: `Concentração de ${count} denúncias do tipo "${type}" na última hora`,
          details: {
            occurrence_type: type,
            count,
          },
        });
      }
    });

    // Se não há alertas, retornar
    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma anomalia detectada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enviar alertas
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    for (const alert of alerts) {
      // Salvar no histórico
      await supabase.from("alert_history").insert({
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        sent_email: alertSettings.email_enabled,
        sent_whatsapp: alertSettings.whatsapp_enabled,
      });

      // Enviar email
      if (alertSettings.email_enabled && alertSettings.email_recipients.length > 0 && resendApiKey) {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">🚨 Alerta de Anomalia Detectada</h2>
              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #991b1b;">
                  ${alert.severity === 'high' ? '⚠️ ALTA PRIORIDADE' : '⚠️ MÉDIA PRIORIDADE'}
                </h3>
                <p style="margin: 0; font-size: 16px; color: #7f1d1d;">${alert.message}</p>
              </div>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0;">Detalhes:</h4>
                <pre style="background: white; padding: 12px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Horário: ${now.toLocaleString('pt-BR')}<br>
                Sistema de Monitoramento de Denúncias
              </p>
            </div>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Alertas 2BPM <onboarding@resend.dev>",
              to: alertSettings.email_recipients,
              subject: `🚨 Alerta: ${alert.message}`,
              html: emailHtml,
            }),
          });
        } catch (error) {
          console.error("Erro ao enviar email:", error);
        }
      }

      // Enviar WhatsApp
      if (alertSettings.whatsapp_enabled && alertSettings.whatsapp_recipients.length > 0) {
        try {
          const whatsappMessage = `
🚨 *ALERTA DE ANOMALIA*

${alert.severity === 'high' ? '⚠️ ALTA PRIORIDADE' : '⚠️ MÉDIA PRIORIDADE'}

*${alert.message}*

Detalhes:
${JSON.stringify(alert.details, null, 2)}

Horário: ${now.toLocaleString('pt-BR')}
Sistema de Monitoramento 2BPM
          `.trim();

          for (const phone of alertSettings.whatsapp_recipients) {
            await supabase.functions.invoke("send-whatsapp", {
              body: {
                to: phone,
                message: whatsappMessage,
              },
            });
          }
        } catch (error) {
          console.error("Erro ao enviar WhatsApp:", error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_detected: alerts.length,
        alerts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao verificar anomalias:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
