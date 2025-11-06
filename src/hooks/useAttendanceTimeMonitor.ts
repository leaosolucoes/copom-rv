import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendDesktopNotification } from '@/utils/notificationUtils';
import { toast } from '@/hooks/use-toast';

interface Complaint {
  id: string;
  protocol_number: string;
  complainant_name: string;
  occurrence_type: string;
  created_at: string;
  verified_at: string | null;
  attendant_id: string | null;
  status: string;
}

interface UseAttendanceTimeMonitorReturn {
  overdueComplaints: Complaint[];
  totalOverdue: number;
  timeLimit: number;
  loading: boolean;
  checkNow: () => void;
  alertsEnabled: boolean;
  soundEnabled: boolean;
}

export const useAttendanceTimeMonitor = (): UseAttendanceTimeMonitorReturn => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [overdueComplaints, setOverdueComplaints] = useState<Complaint[]>([]);
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [checkInterval, setCheckInterval] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  // Buscar configurações do sistema
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'attendance_time_limit_minutes',
          'attendance_time_alert_enabled',
          'attendance_time_alert_sound_enabled',
          'attendance_time_check_interval_seconds'
        ]);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = typeof setting.value === 'string' 
          ? setting.value 
          : JSON.stringify(setting.value);
          
        switch (setting.key) {
          case 'attendance_time_limit_minutes':
            setTimeLimit(parseInt(value) || 60);
            break;
          case 'attendance_time_alert_enabled':
            setAlertsEnabled(value === 'true');
            break;
          case 'attendance_time_alert_sound_enabled':
            setSoundEnabled(value === 'true');
            break;
          case 'attendance_time_check_interval_seconds':
            setCheckInterval(parseInt(value) || 30);
            break;
        }
      });
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  }, []);

  // Buscar denúncias em atendimento
  const fetchComplaints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, protocol_number, complainant_name, occurrence_type, created_at, verified_at, attendant_id, status')
        .not('attendant_id', 'is', null)
        .not('status', 'in', '(processada,arquivada)')
        .is('processed_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComplaints(data || []);
    } catch (error) {
      console.error('Erro ao buscar denúncias:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calcular denúncias atrasadas
  const calculateOverdue = useCallback(() => {
    if (!alertsEnabled) {
      setOverdueComplaints([]);
      return;
    }

    const now = new Date().getTime();
    const limitMs = timeLimit * 60 * 1000;

    const overdue = complaints.filter((complaint) => {
      const startTime = complaint.verified_at 
        ? new Date(complaint.verified_at).getTime()
        : new Date(complaint.created_at).getTime();
      
      const elapsed = now - startTime;
      return elapsed > limitMs;
    });

    // Notificar novas denúncias atrasadas
    overdue.forEach((complaint) => {
      if (!notifiedIds.has(complaint.id)) {
        const startTime = complaint.verified_at || complaint.created_at;
        const elapsedMinutes = Math.floor((now - new Date(startTime).getTime()) / (1000 * 60));
        const delayMinutes = elapsedMinutes - timeLimit;

        // Notificação desktop
        sendDesktopNotification({
          title: '⚠️ Denúncia Atrasada!',
          body: `Protocolo #${complaint.protocol_number}\n${complaint.occurrence_type}\nAtrasado: ${delayMinutes} minutos`,
          tag: `overdue-${complaint.id}`,
        });

        // Toast visual
        toast({
          title: '⚠️ Denúncia Atrasada',
          description: `Protocolo #${complaint.protocol_number} - ${complaint.complainant_name}`,
          variant: 'destructive',
        });

        setNotifiedIds((prev) => new Set(prev).add(complaint.id));
      }
    });

    // Remover IDs de denúncias que não estão mais atrasadas
    setNotifiedIds((prev) => {
      const newSet = new Set(prev);
      prev.forEach((id) => {
        if (!overdue.find((c) => c.id === id)) {
          newSet.delete(id);
        }
      });
      return newSet;
    });

    setOverdueComplaints(overdue);
  }, [complaints, timeLimit, alertsEnabled, notifiedIds]);

  // Inicializar
  useEffect(() => {
    fetchSettings();
    fetchComplaints();
  }, [fetchSettings, fetchComplaints]);

  // Verificar periodicamente
  useEffect(() => {
    calculateOverdue();
    const interval = setInterval(() => {
      calculateOverdue();
    }, checkInterval * 1000);

    return () => clearInterval(interval);
  }, [calculateOverdue, checkInterval]);

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('complaints-attendance-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComplaints]);

  const checkNow = useCallback(() => {
    fetchSettings();
    fetchComplaints();
  }, [fetchSettings, fetchComplaints]);

  return {
    overdueComplaints,
    totalOverdue: overdueComplaints.length,
    timeLimit,
    loading,
    checkNow,
    alertsEnabled,
    soundEnabled,
  };
};
