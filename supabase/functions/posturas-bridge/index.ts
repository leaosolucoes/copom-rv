import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PosturasApiConfig {
  test_endpoint: string;
  test_key: string;
  test_active: boolean;
  prod_endpoint: string;
  prod_key: string;
  prod_active: boolean;
  field_mapping: {
    solicitante: string;
    telefone: string;
    logradouro_solicitante: string;
    numero_solicitante: string;
    quadra_solicitante: string;
    lote_solicitante: string;
    bairro_solicitante: string;
    documento: string;
    logradouro_ocorrencia: string;
    numero_ocorrencia: string;
    quadra_ocorrencia: string;
    lote_ocorrencia: string;
    bairro_ocorrencia: string;
    ponto_referencia: string;
    narrativa: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, complaint_id } = await req.json();

    if (action === 'send') {
      return await handleSendComplaint(supabaseClient, complaint_id);
    } else if (action === 'bairros') {
      return await handleFetchBairros(supabaseClient);
    }

    throw new Error('Ação inválida');

  } catch (error) {
    console.error('Error in posturas-bridge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getApiConfig(supabaseClient: any): Promise<PosturasApiConfig> {
  const { data: settings, error } = await supabaseClient
    .from('system_settings')
    .select('key, value')
    .in('key', [
      'posturas_api_test_endpoint',
      'posturas_api_test_key', 
      'posturas_api_test_active',
      'posturas_api_prod_endpoint',
      'posturas_api_prod_key',
      'posturas_api_prod_active',
      'posturas_api_field_mapping'
    ]);

  if (error) throw new Error('Erro ao buscar configurações da API');

  const config: any = {};
  settings.forEach((setting: any) => {
    const key = setting.key.replace('posturas_api_', '');
    config[key] = setting.value;
  });

  return {
    test_endpoint: config.test_endpoint?.[0] || '',
    test_key: config.test_key?.[0] || '',
    test_active: config.test_active || false,
    prod_endpoint: config.prod_endpoint?.[0] || '',
    prod_key: config.prod_key?.[0] || '',
    prod_active: config.prod_active || false,
    field_mapping: config.field_mapping || {}
  };
}

async function handleSendComplaint(supabaseClient: any, complaintId: string) {
  // Buscar configurações
  const apiConfig = await getApiConfig(supabaseClient);
  
  // Determinar qual ambiente usar
  const isProduction = apiConfig.prod_active;
  const endpoint = isProduction ? apiConfig.prod_endpoint : apiConfig.test_endpoint;
  const key = isProduction ? apiConfig.prod_key : apiConfig.test_key;

  if (!endpoint || !key) {
    throw new Error('Configurações da API não encontradas ou incompletas');
  }

  // Buscar dados da denúncia
  const { data: complaint, error: complaintError } = await supabaseClient
    .from('complaints')
    .select('*')
    .eq('id', complaintId)
    .single();

  if (complaintError || !complaint) {
    throw new Error('Denúncia não encontrada');
  }

  // Preparar dados para envio usando o mapeamento
  const formData = new FormData();
  formData.append('key', key);
  formData.append('service', 'reclamacao');

  const mapping = apiConfig.field_mapping;
  
  // Mapear campos baseado na configuração
  Object.entries(mapping).forEach(([apiField, complaintField]) => {
    if (complaintField && complaint[complaintField]) {
      formData.append(apiField, String(complaint[complaintField]));
    }
  });

  try {
    // Enviar para API da Posturas
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    // Atualizar denúncia com resultado
    if (result.success && result.id_reclamacao) {
      await supabaseClient
        .from('complaints')
        .update({ 
          system_identifier: String(result.id_reclamacao),
          processed_at: new Date().toISOString()
        })
        .eq('id', complaintId);
    }

    // Log da operação
    await supabaseClient
      .from('api_logs')
      .insert({
        endpoint: 'posturas-bridge-send',
        method: 'POST',
        status_code: response.status,
        request_body: { complaint_id: complaintId, environment: isProduction ? 'production' : 'test' },
        response_body: result,
        ip_address: '127.0.0.1',
        user_agent: 'posturas-bridge'
      });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calling Posturas API:', error);
    throw new Error(`Erro ao enviar para API: ${error.message}`);
  }
}

async function handleFetchBairros(supabaseClient: any) {
  const apiConfig = await getApiConfig(supabaseClient);
  
  const isProduction = apiConfig.prod_active;
  const endpoint = isProduction ? apiConfig.prod_endpoint : apiConfig.test_endpoint;
  const key = isProduction ? apiConfig.prod_key : apiConfig.test_key;

  if (!endpoint || !key) {
    throw new Error('Configurações da API não encontradas');
  }

  const formData = new FormData();
  formData.append('key', key);
  formData.append('service', 'bairros');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching bairros:', error);
    throw new Error(`Erro ao buscar bairros: ${error.message}`);
  }
}