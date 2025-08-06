import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type ConfiguracaoAudiencia = Tables<'configuracao_audiencias'>;

export const useConfiguracaoAudiencias = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configuracao, isLoading, error } = useQuery({
    queryKey: ['configuracao-audiencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracao_audiencias')
        .select(`
          *,
          configurado_por_user:users!configurado_por (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  const ativarModulo = useMutation({
    mutationFn: async (configuradoPor: string) => {
      // Primeiro, tentar buscar uma configuração existente
      const { data: existing } = await supabase
        .from('configuracao_audiencias')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Se existe, atualizar
        const { data, error } = await supabase
          .from('configuracao_audiencias')
          .update({ ativo: true, configurado_por: configuradoPor })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Se não existe, criar novo
        const { data, error } = await supabase
          .from('configuracao_audiencias')
          .insert({ ativo: true, configurado_por: configuradoPor })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao-audiencias'] });
      toast({
        title: 'Sucesso',
        description: 'Módulo de audiências ativado com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao ativar módulo: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const desativarModulo = useMutation({
    mutationFn: async (configuradoPor: string) => {
      // Buscar configuração existente
      const { data: existing } = await supabase
        .from('configuracao_audiencias')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('configuracao_audiencias')
          .update({ ativo: false, configurado_por: configuradoPor })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        throw new Error('Configuração não encontrada');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao-audiencias'] });
      toast({
        title: 'Sucesso',
        description: 'Módulo de audiências desativado com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao desativar módulo: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const verificarModuloAtivo = () => {
    return configuracao?.ativo || false;
  };

  return {
    configuracao,
    isLoading,
    error,
    ativarModulo,
    desativarModulo,
    verificarModuloAtivo
  };
};