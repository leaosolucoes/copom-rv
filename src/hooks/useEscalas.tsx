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
  fiscal: { full_name: string }[] | null;
}

export const useEscalas = () => {
  const [escalaAtiva, setEscalaAtiva] = useState<EscalaAtiva | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useSupabaseAuth();

  const fetchEscalaAtiva = async () => {
    if (!profile?.id) return;

    try {
      let query = supabase
        .from('escalas_viaturas')
        .select('*')
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
        .limit(1);

      // Se for motorista, busca por motorista_id
      // Se for fiscal, busca onde está nos fiscal_ids
      if (profile.role === 'motorista') {
        query = query.eq('motorista_id', profile.id);
      } else if (profile.role === 'fiscal') {
        query = query.contains('fiscal_ids', [profile.id]);
      } else {
        // Para outros perfis (admin, etc), pode buscar todas ou nenhuma
        setEscalaAtiva(null);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const escala = data[0];
        
        // Fetch related data
        const [viaturaResult, fiscalResult] = await Promise.all([
          supabase.from('viaturas').select('prefixo, modelo, placa').eq('id', escala.viatura_id).single(),
          escala.fiscal_ids && escala.fiscal_ids.length > 0 ? 
            supabase.from('users').select('full_name').in('id', escala.fiscal_ids) : 
            Promise.resolve({ data: [] })
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