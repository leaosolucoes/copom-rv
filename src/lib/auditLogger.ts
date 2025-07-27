import { supabase } from "@/integrations/supabase/client";

export interface ConsultationAuditData {
  consultationType: 'CPF' | 'CNPJ' | 'CEP';
  searchedData: string;
  searchResult?: any;
  success: boolean;
  errorMessage?: string;
}

export async function logConsultation(data: ConsultationAuditData): Promise<void> {
  try {
    // Obter dados do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Usuário não autenticado para auditoria');
      return;
    }

    // Buscar nome completo do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Obter informações do navegador
    const userAgent = navigator.userAgent;
    
    // Obter IP (será capturado pelo servidor)
    const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
    const ipData = ipResponse ? await ipResponse.json().catch(() => null) : null;

    // Inserir log de auditoria
    const { error } = await supabase
      .from('consultation_audit_logs')
      .insert({
        user_id: user.id,
        user_name: userData?.full_name || user.email || 'Usuário Desconhecido',
        consultation_type: data.consultationType,
        searched_data: data.searchedData,
        search_result: data.searchResult,
        success: data.success,
        error_message: data.errorMessage,
        ip_address: ipData?.ip || null,
        user_agent: userAgent
      });

    if (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  } catch (error) {
    console.error('Erro ao processar auditoria:', error);
  }
}