import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { cep } = await req.json();
    
    if (!cep) {
      return new Response(
        JSON.stringify({ error: 'CEP é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Limpar o CEP (remover caracteres não numéricos)
    const cleanCep = cep.replace(/[^\d]/g, '');
    
    if (cleanCep.length !== 8) {
      return new Response(
        JSON.stringify({ error: 'CEP deve ter 8 dígitos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Consultar API do HubDoDesenvolvedor
    const apiUrl = `https://ws.hubdodesenvolvedor.com.br/v2/cep3/?cep=${cleanCep}&token=180482805qTZObEyXPz325856232`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CEP');
    }

    const data = await response.json();
    
    if (data.resultado === "0") {
      return new Response(
        JSON.stringify({ error: 'CEP não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});