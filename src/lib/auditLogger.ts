import { supabase } from "@/integrations/supabase/client";

export interface ConsultationAuditData {
  consultationType: 'CPF' | 'CNPJ' | 'CEP';
  searchedData: string;
  searchResult?: any;
  success: boolean;
  errorMessage?: string;
}

export async function logConsultation(data: ConsultationAuditData): Promise<void> {
  console.log('🔍 Iniciando logConsultation com dados:', data);
  
  try {
    // Verificar se há sessão ativa primeiro
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔐 Sessão ativa:', session ? 'Sim' : 'Não');
    
    // Obter dados do usuário atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Usuário obtido:', user?.id ? `Autenticado: ${user.id}` : 'Não autenticado');
    console.log('🔑 Auth error:', authError);
    
    if (!user) {
      // Tentar pegar do localStorage como fallback
      const storedUser = localStorage.getItem('supabase.auth.token');
      console.log('💾 Token no localStorage:', storedUser ? 'Existe' : 'Não existe');
      
      console.warn('❌ Usuário não autenticado para auditoria');
      
      // Registrar sem user_id para análise
      const insertData = {
        user_id: null,
        user_name: 'Usuário não autenticado',
        consultation_type: data.consultationType,
        searched_data: data.searchedData,
        search_result: data.searchResult,
        success: data.success,
        error_message: data.errorMessage,
        ip_address: null,
        user_agent: navigator.userAgent
      };
      
      console.log('📝 Tentando inserir sem usuário:', insertData);
      
      const { data: insertResult, error } = await supabase
        .from('consultation_audit_logs')
        .insert(insertData)
        .select();
        
      console.log('💾 Resultado da inserção sem auth:', insertResult, error ? 'Erro:' + error.message : 'Sucesso');
      return;
    }

    // Buscar nome completo do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
      
    console.log('📋 Dados do usuário:', userData, userError ? 'Erro:' + userError.message : '');

    // Obter informações do navegador
    const userAgent = navigator.userAgent;
    
    // Obter IP (será capturado pelo servidor)
    const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
    const ipData = ipResponse ? await ipResponse.json().catch(() => null) : null;
    console.log('🌐 IP obtido:', ipData?.ip || 'Falhou ao obter IP');

    const insertData = {
      user_id: user.id,
      user_name: userData?.full_name || user.email || 'Usuário Desconhecido',
      consultation_type: data.consultationType,
      searched_data: data.searchedData,
      search_result: data.searchResult,
      success: data.success,
      error_message: data.errorMessage,
      ip_address: ipData?.ip || null,
      user_agent: userAgent
    };
    
    console.log('📝 Dados para inserção:', insertData);

    // Inserir log de auditoria
    const { data: insertResult, error } = await supabase
      .from('consultation_audit_logs')
      .insert(insertData)
      .select();

    console.log('💾 Resultado da inserção:', insertResult, error ? 'Erro:' + error.message : 'Sucesso');

    if (error) {
      console.error('❌ Erro ao registrar auditoria:', error);
    } else {
      console.log('✅ Auditoria registrada com sucesso!', insertResult);
    }
  } catch (error) {
    console.error('💥 Erro ao processar auditoria:', error);
  }
}