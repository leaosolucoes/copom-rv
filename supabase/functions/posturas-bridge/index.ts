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

// Helper: detect TLS name/certificate errors
function isTlsNameError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return /invalid peer certificate|NotValidForName|certificate/i.test(msg);
}

// Helper: POST with TLS fallback (only in test env)
async function postWithTlsFallback(endpoint: string, formData: FormData, isProduction: boolean) {
  try {
    const response = await fetch(endpoint, { method: 'POST', body: formData });
    return { response, usedFallback: false, usedEndpoint: endpoint };
  } catch (err) {
    if (!isProduction && endpoint.startsWith('https://') && isTlsNameError(err)) {
      const insecureEndpoint = endpoint.replace(/^https:/, 'http:');
      console.warn('TLS error detected, retrying over HTTP (test env only)', { original: endpoint, insecureEndpoint });
      const response = await fetch(insecureEndpoint, { method: 'POST', body: formData });
      return { response, usedFallback: true, usedEndpoint: insecureEndpoint };
    }
    throw err;
  }
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
    test_endpoint: Array.isArray(config.test_endpoint) && config.test_endpoint.length > 0 ? config.test_endpoint[0] : '',
    test_key: Array.isArray(config.test_key) && config.test_key.length > 0 ? config.test_key[0] : '',
    test_active: config.test_active || false,
    prod_endpoint: Array.isArray(config.prod_endpoint) && config.prod_endpoint.length > 0 ? config.prod_endpoint[0] : '',
    prod_key: Array.isArray(config.prod_key) && config.prod_key.length > 0 ? config.prod_key[0] : '',
    prod_active: config.prod_active || false,
    field_mapping: config.field_mapping || {}
  };
}

async function handleSendComplaint(supabaseClient: any, complaintId: string) {
  try {
    // Buscar configurações
    const apiConfig = await getApiConfig(supabaseClient);
    
    // Determinar qual ambiente usar
    const isProduction = apiConfig.prod_active;
    const endpoint = isProduction ? apiConfig.prod_endpoint : apiConfig.test_endpoint;
    const key = isProduction ? apiConfig.prod_key : apiConfig.test_key;
    
    console.log('API Config:', { 
      isProduction, 
      endpoint: endpoint ? 'SET' : 'NOT SET', 
      key: key ? 'SET' : 'NOT SET',
      test_active: apiConfig.test_active,
      prod_active: apiConfig.prod_active
    });

    if (!endpoint || endpoint === '' || !key || key === '') {
      const environment = isProduction ? 'produção' : 'teste';
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Configurações da API Posturas não encontradas para ambiente de ${environment}`,
          message: `Por favor, configure o endpoint e chave da API para o ambiente de ${environment} na seção Posturas-API.`,
          details: {
            environment,
            endpoint_set: !!endpoint && endpoint !== '',
            key_set: !!key && key !== ''
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar dados da denúncia
    const { data: complaint, error: complaintError } = await supabaseClient
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .maybeSingle();

    if (complaintError) {
      console.error('Database error:', complaintError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao buscar denúncia no banco de dados',
          message: complaintError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!complaint) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Denúncia não encontrada',
          message: `Não foi possível encontrar a denúncia com ID: ${complaintId}` 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
    // Enviar para API da Posturas (com fallback de TLS em ambiente de teste)
    const { response, usedFallback, usedEndpoint } = await postWithTlsFallback(endpoint, formData, isProduction);

    const result = await response.json().catch(() => ({ raw: 'non-JSON response' }));
    
    // Atualizar denúncia com resultado quando sucesso
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
        request_body: { complaint_id: complaintId, environment: isProduction ? 'production' : 'test', used_fallback_http: usedFallback },
        response_body: result,
        ip_address: '127.0.0.1',
        user_agent: 'posturas-bridge'
      });

    return new Response(
      JSON.stringify({ ...result, used_fallback_http: usedFallback, endpoint: usedEndpoint }),
      { status: response.ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calling Posturas API:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro ao conectar com a API Posturas',
        message: `Falha na comunicação com o sistema: ${error.message}`,
        details: { environment: isProduction ? 'production' : 'test', hint: isTlsNameError(error) ? 'Problema de certificado TLS do servidor. Verifique o domínio e o certificado do endpoint.' : undefined }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
} catch (error) {
  console.error('Error in handleSendComplaint:', error);
  return new Response(
    JSON.stringify({ 
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    }),
    { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
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
    const { response, usedFallback } = await postWithTlsFallback(endpoint, formData, isProduction);

    const result = await response.json().catch(() => ({ raw: 'non-JSON response' }));

    return new Response(
      JSON.stringify({ ...result, used_fallback_http: usedFallback }),
      { status: response.ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching bairros:', error);
    throw new Error(`Erro ao buscar bairros: ${error.message}`);
  }
}