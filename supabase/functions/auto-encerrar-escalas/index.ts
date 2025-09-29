import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      escalas_viaturas: {
        Row: {
          id: string
          viatura_id: string
          motorista_id: string
          fiscal_ids: string[] | null
          data_servico: string
          hora_entrada: string
          hora_saida: string
          km_inicial: number
          km_final: number | null
          celular_funcional: string | null
          observacoes: string | null
          status: 'ativa' | 'encerrada'  
          created_at: string
          updated_at: string
          encerrado_em: string | null
          encerrado_por: string | null
        }
        Insert: {
          id?: string
          viatura_id: string
          motorista_id: string
          fiscal_ids?: string[] | null
          data_servico: string
          hora_entrada: string
          hora_saida: string
          km_inicial: number
          km_final?: number | null
          celular_funcional?: string | null
          observacoes?: string | null
          status?: 'ativa' | 'encerrada'
          created_at?: string
          updated_at?: string
          encerrado_em?: string | null
          encerrado_por?: string | null
        }
        Update: {
          id?: string
          viatura_id?: string
          motorista_id?: string
          fiscal_ids?: string[] | null
          data_servico?: string
          hora_entrada?: string
          hora_saida?: string
          km_inicial?: number
          km_final?: number | null
          celular_funcional?: string | null
          observacoes?: string | null
          status?: 'ativa' | 'encerrada'
          created_at?: string
          updated_at?: string
          encerrado_em?: string | null
          encerrado_por?: string | null
        }
      }
    }
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('=== INICIANDO VERIFICAÇÃO DE ESCALAS ===')
    
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obter data e hora atual no timezone do Brasil
    const agora = new Date()
    console.log('Data/Hora UTC atual:', agora.toISOString())
    
    // Converter para timezone do Brasil usando Intl.DateTimeFormat
    const brasiliaFormatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const brasiliaTime = brasiliaFormatter.format(agora)
    const [dataBrasilia, horaBrasilia] = brasiliaTime.split(' ')
    const horaAtualMinutos = horaBrasilia.split(':').slice(0, 2).join(':')

    console.log(`Data Brasília: ${dataBrasilia}`)
    console.log(`Hora Brasília: ${horaAtualMinutos}`)

    // Buscar escalas ativas
    const { data: escalasAtivas, error: fetchError } = await supabaseClient
      .from('escalas_viaturas')
      .select('*')
      .eq('status', 'ativa')

    if (fetchError) {
      console.error('Erro ao buscar escalas:', fetchError)
      throw fetchError
    }

    console.log(`Escalas ativas encontradas: ${escalasAtivas?.length || 0}`)

    if (!escalasAtivas || escalasAtivas.length === 0) {
      console.log('Nenhuma escala ativa encontrada')
      return new Response(
        JSON.stringify({ 
          message: 'Nenhuma escala ativa encontrada',
          processedAt: brasiliaTime
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      )
    }

    // Verificar se já são 07:00h ou depois no horário de Brasília
    const [horasAtual, minutosAtual] = horaAtualMinutos.split(':').map(Number)
    const minutosAtualTotal = horasAtual * 60 + minutosAtual
    const seteHoras = 7 * 60 // 07:00h em minutos (420 minutos)
    
    console.log(`Hora atual: ${horasAtual}:${minutosAtual.toString().padStart(2, '0')} (${minutosAtualTotal} minutos)`)
    console.log(`Horário de encerramento: 07:00 (${seteHoras} minutos)`)

    let escalasParaEncerrar: any[] = []

    // Se já passou das 07:00h, encerrar TODAS as escalas ativas
    if (minutosAtualTotal >= seteHoras) {
      console.log('Já passou das 07:00h - encerrando TODAS as escalas ativas')
      escalasParaEncerrar = escalasAtivas || []
    } else {
      console.log(`Ainda não são 07:00h (atual: ${horasAtual}:${minutosAtual.toString().padStart(2, '0')}). Escalas mantidas ativas.`)
    }

    if (escalasParaEncerrar.length === 0) {
      console.log('Nenhuma escala vencida encontrada')
      return new Response(
        JSON.stringify({ 
          message: 'Nenhuma escala vencida encontrada',
          processedAt: brasiliaTime,
          totalEscalasAtivas: escalasAtivas.length,
          dataAtual: dataBrasilia,
          horaAtual: horaAtualMinutos
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      )
    }

    console.log(`=== ENCERRANDO ${escalasParaEncerrar.length} ESCALAS ===`)

    // Encerrar as escalas vencidas
    const idsParaEncerrar = escalasParaEncerrar.map(e => e.id)
    
    const updateData = {
      status: 'encerrada' as const,
      encerrado_em: new Date().toISOString(),
      encerrado_por: null as string | null,
      observacoes: 'Encerrado automaticamente por vencimento do horário'
    }
    
    const { data: escalasEncerradas, error: updateError } = await (supabaseClient as any)
      .from('escalas_viaturas')
      .update({
        status: 'encerrada',
        encerrado_em: new Date().toISOString(),
        encerrado_por: null,
        observacoes: 'Encerrado automaticamente por vencimento do horário'
      })
      .in('id', idsParaEncerrar)
      .select()

    if (updateError) {
      console.error('Erro ao encerrar escalas:', updateError)
      throw updateError
    }

    console.log(`${escalasEncerradas?.length || 0} escalas encerradas com sucesso`)

    // Log detalhado das escalas encerradas
    for (const escala of escalasParaEncerrar) {
      console.log(`Escala encerrada: ID ${escala.id}, Viatura ${escala.viatura_id}, Data: ${escala.data_servico}, Saída: ${escala.hora_saida}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${escalasEncerradas?.length || 0} escalas encerradas automaticamente`,
        processedAt: brasiliaTime,
        dataAtual: dataBrasilia,
        horaAtual: horaAtualMinutos,
        escalasEncerradas: escalasEncerradas?.map((e: any) => ({
          id: e.id,
          viatura_id: e.viatura_id,
          data_servico: e.data_servico,
          hora_saida: e.hora_saida
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('=== ERRO NO PROCESSAMENTO ===', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno do servidor',
        details: error?.message || String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})