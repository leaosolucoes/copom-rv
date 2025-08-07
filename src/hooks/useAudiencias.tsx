import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { obterDataBrasilFormatada } from '@/utils/dataBrasil';

type Audiencia = Tables<'audiencias'>;
type AudienciaWithUser = Audiencia & {
  user: {
    full_name: string;
    email: string;
    role: string;
  };
  criado_por_user: {
    full_name: string;
  };
};

export const useAudiencias = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Configurar real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('audiencias-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audiencias'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Invalidar todas as queries relacionadas às audiências
          queryClient.invalidateQueries({ queryKey: ['audiencias'] });
          queryClient.invalidateQueries({ queryKey: ['audiencias-hoje'] });
          queryClient.invalidateQueries({ queryKey: ['audiencias-pendentes'] });
          queryClient.invalidateQueries({ queryKey: ['audiencias-assinadas'] });

          // Mostrar notificação baseada no tipo de evento
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'Novo ofício criado',
              description: 'Um novo ofício foi adicionado à lista',
            });
          } else if (payload.eventType === 'UPDATE') {
            const oldRecord = payload.old;
            const newRecord = payload.new;

            if (oldRecord?.status !== newRecord?.status) {
              if (newRecord?.status === 'assinado') {
                toast({
                  title: 'Ofício assinado digitalmente',
                  description: `Processo ${newRecord?.numero_processo} foi assinado`,
                  duration: 5000,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const { data: audiencias, isLoading, error } = useQuery({
    queryKey: ['audiencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audiencias')
        .select(`
          *,
          user:users!user_id (
            full_name,
            email,
            role
          ),
          criado_por_user:users!criado_por (
            full_name
          )
        `)
        .order('data_audiencia', { ascending: true });

      if (error) throw error;
      return data as AudienciaWithUser[];
    }
  });

  const { data: audienciasHoje } = useQuery({
    queryKey: ['audiencias-hoje'],
    queryFn: async () => {
      const dataHoje = obterDataBrasilFormatada();

      const { data, error } = await supabase
        .from('audiencias')
        .select(`
          *,
          user:users!user_id (
            full_name,
            email,
            role
          )
        `)
        .eq('data_audiencia', dataHoje);

      if (error) throw error;
      return data as AudienciaWithUser[];
    }
  });

  const { data: audienciasPendentes } = useQuery({
    queryKey: ['audiencias-pendentes'],
    queryFn: async () => {
      console.log('Fetching audiencias pendentes...');
      const { data, error } = await supabase
        .from('audiencias')
        .select(`
          *,
          user:users!user_id (
            full_name,
            email,
            role
          )
        `)
        .eq('status', 'pendente');

      if (error) throw error;
      console.log('Audiencias pendentes:', data);
      return data as AudienciaWithUser[];
    },
    staleTime: 0, // Always refetch
    refetchInterval: 5000 // Refetch every 5 seconds
  });

  const { data: audienciasAssinadas } = useQuery({
    queryKey: ['audiencias-assinadas'],
    queryFn: async () => {
      console.log('Fetching audiencias assinadas...');
      const { data, error } = await supabase
        .from('audiencias')
        .select(`
          *,
          user:users!user_id (
            full_name,
            email,
            role
          )
        `)
        .eq('status', 'assinado');

      if (error) throw error;
      console.log('Audiencias assinadas:', data);
      return data as AudienciaWithUser[];
    },
    staleTime: 0, // Always refetch
    refetchInterval: 5000 // Refetch every 5 seconds
  });

  const criarAudiencia = useMutation({
    mutationFn: async (audiencia: Omit<Audiencia, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('audiencias')
        .insert([audiencia])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiencias'] });
      toast({
        title: 'Sucesso',
        description: 'Audiência criada com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao criar audiência: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const atualizarAudiencia = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Audiencia> & { id: string }) => {
      const { data, error } = await supabase
        .from('audiencias')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiencias'] });
      toast({
        title: 'Sucesso',
        description: 'Audiência atualizada com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar audiência: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  return {
    audiencias,
    audienciasHoje,
    audienciasPendentes,
    audienciasAssinadas,
    isLoading,
    error,
    criarAudiencia,
    atualizarAudiencia
  };
};