import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== TESTANDO API CPF ===');
    
    const cpf = '70335214134';
    console.log('CPF para teste:', cpf);
    
    // Construir URL da API externa
    const apiUrl = `https://ws.hubdodesenvolvedor.com.br/v2/cpf/?cpf=${cpf}&token=129071InicieBq1OOD&token2=129071YVBjZGVNRq102`;
    console.log('URL da API:', apiUrl);
    
    // Fazer a consulta
    const response = await fetch(apiUrl);
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('=== DADOS RECEBIDOS DA API EXTERNA ===');
    console.log('Data completo:', JSON.stringify(data, null, 2));
    console.log('Tipo do data:', typeof data);
    console.log('Keys do data:', Object.keys(data));
    
    // Verificar estrutura
    console.log('=== ESTRUTURA DOS DADOS ===');
    console.log('data.status:', data.status);
    console.log('data.return:', data.return);
    console.log('data.consumed:', data.consumed);
    console.log('data.result existe?', !!data.result);
    console.log('data.data existe?', !!data.data);
    
    if (data.result) {
      console.log('=== CONTEÚDO DE data.result ===');
      console.log('data.result:', JSON.stringify(data.result, null, 2));
      console.log('Keys de data.result:', Object.keys(data.result));
    }
    
    if (data.data) {
      console.log('=== CONTEÚDO DE data.data ===');
      console.log('data.data:', JSON.stringify(data.data, null, 2));
      console.log('Keys de data.data:', Object.keys(data.data));
    }
    
    return new Response(JSON.stringify({
      success: true,
      originalData: data,
      analysis: {
        hasResult: !!data.result,
        hasData: !!data.data,
        status: data.status,
        return: data.return,
        consumed: data.consumed
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Erro no teste:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});