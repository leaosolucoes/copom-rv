import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ComplaintData {
  complainant_name: string
  complainant_phone: string
  complainant_type: string
  complainant_address: string
  complainant_number?: string
  complainant_block?: string
  complainant_lot?: string
  complainant_neighborhood: string
  occurrence_type: string
  occurrence_address: string
  occurrence_number?: string
  occurrence_block?: string
  occurrence_lot?: string
  occurrence_neighborhood: string
  occurrence_reference?: string
  narrative: string
  occurrence_date?: string
  occurrence_time?: string
  classification: string
  assigned_to?: string
  photos?: string[]
  videos?: string[]
  user_location?: any
  user_device_type?: string
  user_browser?: string
  user_agent?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Capturar IP do usuário
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    console.log('IP capturado:', clientIP)

    // Pegar dados da denúncia do body
    const complaintData: ComplaintData = await req.json()
    
    // Adicionar IP aos dados
    const dataWithIP = {
      ...complaintData,
      user_ip: clientIP
    }

    console.log('Dados da denúncia com IP:', dataWithIP)

    // Inserir denúncia no banco
    const { data, error } = await supabase
      .from('complaints')
      .insert([dataWithIP])
      .select()

    if (error) {
      console.error('Erro ao inserir denúncia:', error)
      throw error
    }

    console.log('Denúncia inserida com sucesso:', data)

    return new Response(JSON.stringify({ 
      success: true, 
      data: data[0],
      ip: clientIP 
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    })

  } catch (error) {
    console.error('Erro na edge function:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    })
  }
})