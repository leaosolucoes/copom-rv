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
  description: string
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

    // Capturar IP do usuário - pegar apenas o primeiro IP válido
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    
    let clientIP = 'unknown'
    if (forwardedFor) {
      // Pegar apenas o primeiro IP da lista (formato: "ip1, ip2, ip3")
      clientIP = forwardedFor.split(',')[0].trim()
    } else if (realIP) {
      clientIP = realIP
    }
    
    console.log('🌐 IP do cliente capturado:', clientIP)

    // Pegar dados da denúncia do body
    const complaintData: ComplaintData = await req.json()
    
    console.log('📝 Dados recebidos do formulário')
    console.log('Nome do denunciante:', complaintData.complainant_name)
    console.log('Telefone:', complaintData.complainant_phone)
    console.log('Tipo de ocorrência:', complaintData.occurrence_type)
    console.log('Classificação:', complaintData.classification)
    console.log('Descrição:', complaintData.description?.substring(0, 50) + '...')
    console.log('Fotos:', complaintData.photos?.length || 0)
    console.log('Vídeos:', complaintData.videos?.length || 0)
    
    // Adicionar IP aos dados
    const dataWithIP = {
      ...complaintData,
      user_ip: clientIP
    }
    
    console.log('📡 Inserindo denúncia no banco de dados...')

    // Inserir denúncia no banco
    const { data, error } = await supabase
      .from('complaints')
      .insert([dataWithIP])
      .select()

    if (error) {
      console.error('❌ Erro ao inserir denúncia no Supabase')
      console.error('Código do erro:', error.code)
      console.error('Mensagem do erro:', error.message)
      console.error('Detalhes:', JSON.stringify(error, null, 2))
      throw new Error(`Erro ao inserir denúncia: ${error.message}`)
    }

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
    console.error('❌ Erro na edge function capture-user-ip:', error)
    console.error('Detalhes do erro:', JSON.stringify(error, null, 2))
    
    // Se for um erro do Supabase, pegar detalhes
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : String(error)
    
    console.error('Erro detalhado:', errorDetails)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      details: errorDetails
    }), {
      status: 400,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    })
  }
})