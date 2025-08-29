import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";

interface EscalaAtiva {
  id: string;
  viatura_id: string;
  data_servico: string;
  hora_entrada: string;
  hora_saida: string;
  km_inicial: number;
  celular_funcional: string | null;
  viaturas: { prefixo: string; modelo: string; placa: string } | null;
  fiscal: { full_name: string } | null;
}

export const useEscalas = () => {
  const [escalaAtiva, setEscalaAtiva] = useState<EscalaAtiva | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useSupabaseAuth();

  const fetchEscalaAtiva = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('escalas_viaturas')
        .select('*')
        .eq('motorista_id', profile.id)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const escala = data[0];
        
        // Fetch related data
        const [viaturaResult, fiscalResult] = await Promise.all([
          supabase.from('viaturas').select('prefixo, modelo, placa').eq('id', escala.viatura_id).single(),
          escala.fiscal_id ? supabase.from('users').select('full_name').eq('id', escala.fiscal_id).single() : Promise.resolve({ data: null })
        ]);

        setEscalaAtiva({
          ...escala,
          viaturas: viaturaResult.data,
          fiscal: fiscalResult.data
        });
      } else {
        setEscalaAtiva(null);
      }
    } catch (error) {
      console.error('Erro ao buscar escala ativa:', error);
      setEscalaAtiva(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalaAtiva();
  }, [profile?.id]);

  return {
    escalaAtiva,
    loading,
    refetch: fetchEscalaAtiva
  };
};