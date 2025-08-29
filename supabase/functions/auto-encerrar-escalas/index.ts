import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface Database {
  public: {
    Tables: {
      escalas_viaturas: {
        Row: {
          id: string
          viatura_id: string
          motorista_id: string
          fiscal_id: string | null
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
          fiscal_id?: string | null
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
          fiscal_id?: string | null
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

serve(async (req) => {
  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obter data e hora atual no timezone do Brasil
    const agora = new Date()
    const brasiliaTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(agora)

    const [dataBrasilia, horaBrasilia] = brasiliaTime.split(' ')
    const horaAtualMinutos = horaBrasilia.split(':').slice(0, 2).join(':')

    console.log(`Verificando escalas vencidas em: ${dataBrasilia} ${horaAtualMinutos}`)

    // Buscar escalas ativas que já passaram do horário de saída
    const { data: escalasVencidas, error: fetchError } = await supabaseClient
      .from('escalas_viaturas')
      .select('*')
      .eq('status', 'ativa')
      .lte('data_servico', dataBrasilia)

    if (fetchError) {
      console.error('Erro ao buscar escalas:', fetchError)
      throw fetchError
    }

    if (!escalasVencidas || escalasVencidas.length === 0) {
      console.log('Nenhuma escala ativa encontrada')
      return new Response(
        JSON.stringify({ 
          message: 'Nenhuma escala ativa encontrada',
          processedAt: brasiliaTime
        }),
        { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 200 
        }
      )
    }

    const escalasParaEncerrar = []

    for (const escala of escalasVencidas) {
      // Para escalas de hoje, verificar se passou do horário
      if (escala.data_servico === dataBrasilia) {
        const [horasSaida, minutosSaida] = escala.hora_saida.split(':').map(Number)
        const [horasAtual, minutosAtual] = horaAtualMinutos.split(':').map(Number)
        
        const minutosSaidaTotal = horasSaida * 60 + minutosSaida
        const minutosAtualTotal = horasAtual * 60 + minutosAtual
        
        // Se a hora de saída já passou, marcar para encerramento
        if (minutosAtualTotal >= minutosSaidaTotal) {
          escalasParaEncerrar.push(escala)
        }
      } else {
        // Para escalas de dias anteriores, encerrar automaticamente
        escalasParaEncerrar.push(escala)
      }
    }

    if (escalasParaEncerrar.length === 0) {
      console.log('Nenhuma escala vencida encontrada')
      return new Response(
        JSON.stringify({ 
          message: 'Nenhuma escala vencida encontrada',
          processedAt: brasiliaTime,
          totalEscalasAtivas: escalasVencidas.length
        }),
        { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 200 
        }
      )
    }

    console.log(`Encontradas ${escalasParaEncerrar.length} escalas para encerrar`)

    // Encerrar as escalas vencidas
    const idsParaEncerrar = escalasParaEncerrar.map(e => e.id)
    
    const { data: escalasEncerradas, error: updateError } = await supabaseClient
      .from('escalas_viaturas')
      .update({
        status: 'encerrada',
        encerrado_em: new Date().toISOString(),
        encerrado_por: null, // Encerramento automático
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
      console.log(`Escala encerrada: Viatura ${escala.viatura_id}, Data: ${escala.data_servico}, Saída: ${escala.hora_saida}`)
    }

    return new Response(
      JSON.stringify({ 
        message: `${escalasEncerradas?.length || 0} escalas encerradas automaticamente`,
        processedAt: brasiliaTime,
        escalasEncerradas: escalasEncerradas?.map(e => ({
          id: e.id,
          viatura_id: e.viatura_id,
          data_servico: e.data_servico,
          hora_saida: e.hora_saida
        }))
      }),
      { 
        headers: { 'Content-Type': 'application/json' }, 
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro no processamento:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})