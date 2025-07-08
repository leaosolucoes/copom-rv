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
    const { cnpj } = await req.json();
    
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Limpar o CNPJ (remover caracteres não numéricos)
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ deve ter 14 dígitos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Consultar API da ReceitaWS (gratuita)
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CNPJ');
    }

    const data = await response.json();
    
    if (data.status === 'ERROR') {
      return new Response(
        JSON.stringify({ error: data.message || 'CNPJ não encontrado' }),
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
    console.error('Erro ao buscar CNPJ:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});