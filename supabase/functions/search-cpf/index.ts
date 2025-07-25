import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cpf } = await req.json()

    if (!cpf) {
      return new Response(
        JSON.stringify({ error: 'CPF é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Remove todos os caracteres não numéricos
    const cpfNumbers = cpf.replace(/\D/g, '')

    if (cpfNumbers.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'CPF deve ter 11 dígitos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fazer a consulta na API externa com a URL correta
    const apiUrl = `https://ws.hubdodesenvolvedor.com.br/v2/cadastropf/?cpf=${cpfNumbers}&token=180482805qTZObEyXPz325856232&contract=cldaSkx2b3dnazRQSUlkM1BQQ25QejRvd3ZOb05ueDhHZURMVVZqekE3ST0=`

    console.log('Consultando CPF:', cpfNumbers)
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      console.error('Erro na API externa:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ error: `Erro na consulta: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('Resposta da API:', data)

    // Verificar se houve erro na resposta
    if (data.erro || !data) {
      return new Response(
        JSON.stringify({ error: 'CPF não encontrado ou dados indisponíveis' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})