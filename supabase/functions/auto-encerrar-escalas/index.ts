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

serve(async (req) => {
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
          headers: { 'Content-Type': 'application/json' }, 
          status: 200 
        }
      )
    }

    const escalasParaEncerrar = []

    for (const escala of escalasAtivas) {
      console.log(`Verificando escala ${escala.id}:`)
      console.log(`  - Data serviço: ${escala.data_servico}`)
      console.log(`  - Hora saída: ${escala.hora_saida}`)
      
      // Verificar se a data de serviço é anterior à data atual
      if (escala.data_servico < dataBrasilia) {
        console.log(`  - Data anterior: ${escala.data_servico} < ${dataBrasilia} - ENCERRA`)
        escalasParaEncerrar.push(escala)
        continue
      }
      
      // Para escalas de hoje, verificar se passou do horário
      if (escala.data_servico === dataBrasilia) {
        const [horasSaida, minutosSaida] = escala.hora_saida.split(':').map(Number)
        const [horasAtual, minutosAtual] = horaAtualMinutos.split(':').map(Number)
        
        const minutosSaidaTotal = horasSaida * 60 + minutosSaida
        const minutosAtualTotal = horasAtual * 60 + minutosAtual
        
        console.log(`  - Comparação de horário:`)
        console.log(`    Saída programada: ${horasSaida}:${minutosSaida.toString().padStart(2, '0')} (${minutosSaidaTotal} minutos)`)
        console.log(`    Hora atual: ${horasAtual}:${minutosAtual.toString().padStart(2, '0')} (${minutosAtualTotal} minutos)`)
        
        // CORREÇÃO: Só encerra se a hora atual for MAIOR que a hora de saída (não igual)
        // Adiciona margem de 5 minutos para evitar encerramento precoce
        if (minutosAtualTotal > minutosSaidaTotal + 5) {
          console.log(`  - Passou do horário com margem: ${minutosAtualTotal} > ${minutosSaidaTotal + 5} - ENCERRA`)
          escalasParaEncerrar.push(escala)
        } else {
          console.log(`  - Ainda no horário ou dentro da margem: ${minutosAtualTotal} <= ${minutosSaidaTotal + 5} - MANTÉM`)
        }
      } else {
        console.log(`  - Data futura: ${escala.data_servico} > ${dataBrasilia} - MANTÉM`)
      }
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
          headers: { 'Content-Type': 'application/json' }, 
          status: 200 
        }
      )
    }

    console.log(`=== ENCERRANDO ${escalasParaEncerrar.length} ESCALAS ===`)

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
      console.log(`Escala encerrada: ID ${escala.id}, Viatura ${escala.viatura_id}, Data: ${escala.data_servico}, Saída: ${escala.hora_saida}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${escalasEncerradas?.length || 0} escalas encerradas automaticamente`,
        processedAt: brasiliaTime,
        dataAtual: dataBrasilia,
        horaAtual: horaAtualMinutos,
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
    console.error('=== ERRO NO PROCESSAMENTO ===', error)
    return new Response(
      JSON.stringify({ 
        success: false,
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