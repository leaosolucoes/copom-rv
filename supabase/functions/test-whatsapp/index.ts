import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== EDGE FUNCTION CHAMADA ===', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Retornando CORS headers')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processando requisição POST...')
    
    // Test basic connectivity first
    const testResponse = {
      success: true,
      message: 'Edge function está funcionando!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    }
    
    console.log('Retornando resposta de teste:', testResponse)
    
    return new Response(
      JSON.stringify(testResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})