import { supabase } from '@/integrations/supabase/client';

interface LogLoginAttemptParams {
  email: string;
  success: boolean;
  failedReason?: string;
  captchaRequired?: boolean;
  captchaCompleted?: boolean;
  blocked?: boolean;
  blockDurationSeconds?: number;
  userId?: string;
}

/**
 * Registra tentativa de login no banco de dados para monitoramento
 */
export const logLoginAttempt = async (params: LogLoginAttemptParams): Promise<void> => {
  try {
    // Obter informações do navegador e dispositivo
    const userAgent = navigator.userAgent;
    
    // Informações do dispositivo
    const deviceInfo = {
      userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Inserir registro no banco
    const { error } = await supabase
      .from('login_attempts')
      .insert({
        email_attempted: params.email.toLowerCase().trim(),
        success: params.success,
        failed_reason: params.failedReason,
        captcha_required: params.captchaRequired || false,
        captcha_completed: params.captchaCompleted || false,
        blocked: params.blocked || false,
        block_duration_seconds: params.blockDurationSeconds,
        user_id: params.userId,
        ip_address: null, // Será obtido no servidor se necessário
        user_agent: userAgent,
        geolocation: null, // Será obtido no servidor se necessário
        device_info: deviceInfo
      });

    if (error) {
      console.error('Erro ao registrar tentativa de login:', error);
    }
  } catch (error) {
    // Falha silenciosa - não queremos impactar o fluxo de login
    console.error('Erro ao registrar tentativa de login:', error);
  }
};
