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
    // Primeiro tentar obter do sistema customizado (localStorage)
    let user = null;
    let userProfile = null;
    
    try {
      const customSession = localStorage.getItem('custom_session');
      const customProfile = localStorage.getItem('custom_profile');
      
      if (customSession && customProfile) {
        const session = JSON.parse(customSession);
        userProfile = JSON.parse(customProfile);
        user = session.user;
        console.log('👤 Usuário obtido do sistema customizado:', userProfile.full_name, 'ID:', user.id);
      }
    } catch (error) {
      console.log('❌ Erro ao ler sessão customizada:', error);
    }
    
    // Fallback para Supabase auth se não encontrou sessão customizada
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Sessão Supabase:', session ? 'Sim' : 'Não');
      
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Usuário Supabase:', supabaseUser?.id ? `Autenticado: ${supabaseUser.id}` : 'Não autenticado');
      console.log('🔑 Auth error:', authError);
      
      user = supabaseUser;
    }
    
    if (!user) {
      console.warn('❌ Usuário não autenticado - registrando sem user_id');
      
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

    // Se temos perfil customizado, usar ele, senão buscar no banco
    let userData = userProfile;
    let validUserId = null;
    
    if (!userData && user?.id) {
      const { data: dbUserData, error: userError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
        
      console.log('📋 Dados do usuário do banco:', dbUserData, userError ? 'Erro:' + userError.message : '');
      
      if (dbUserData && !userError) {
        userData = dbUserData;
        validUserId = user.id;
      }
    } else if (userProfile && user?.id) {
      validUserId = user.id;
    }

    // Obter informações do navegador
    const userAgent = navigator.userAgent;
    
    // Obter IP (será capturado pelo servidor)
    const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
    const ipData = ipResponse ? await ipResponse.json().catch(() => null) : null;
    console.log('🌐 IP obtido:', ipData?.ip || 'Falhou ao obter IP');

    const insertData = {
      user_id: validUserId, // Usar apenas se for um ID válido
      user_name: userData?.full_name || user?.email || 'Usuário Desconhecido',
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