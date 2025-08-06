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
      const { data, error } = await supabase
        .from('configuracao_audiencias')
        .upsert({
          ativo: true,
          configurado_por: configuradoPor
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('configuracao_audiencias')
        .upsert({
          ativo: false,
          configurado_por: configuradoPor
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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