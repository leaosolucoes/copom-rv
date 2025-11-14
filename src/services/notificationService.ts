import { supabase } from '@/integrations/supabase/client';

interface NotificationFilter {
  userRole: string;
  complaintsTypes?: string[];
  locations?: string[];
  minPriority?: string;
}

interface NotificationHook {
  sendNotification: (options: any) => Promise<void>;
}

class NotificationService {
  private realtimeChannel: any = null;
  private notificationHook: NotificationHook | null = null;
  private lastNotificationTime = 0;
  private notificationThrottle = 5000; // 5 segundos entre notificações

  initialize(notificationHook: NotificationHook, filter: NotificationFilter) {
    this.notificationHook = notificationHook;
    this.setupRealtimeListener(filter);
  }

  private setupRealtimeListener(filter: NotificationFilter) {
    // Remover listener anterior se existir
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    // Criar novo listener
    this.realtimeChannel = supabase
      .channel('complaints-push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaints',
        },
        async (payload) => {
          const newComplaint = payload.new;

          // Aplicar filtros
          if (!this.shouldNotify(newComplaint, filter)) {
            return;
          }

          // Throttle para evitar spam
          const now = Date.now();
          if (now - this.lastNotificationTime < this.notificationThrottle) {
            console.log('Notificação throttled, aguardando...');
            return;
          }
          this.lastNotificationTime = now;

          // Buscar dados completos da denúncia
          const { data: complaintData } = await supabase
            .from('complaints')
            .select('*')
            .eq('id', newComplaint.id)
            .single();

          if (complaintData) {
            this.sendNotification(complaintData);
          }
        }
      )
      .subscribe();
  }

  private shouldNotify(complaint: any, filter: NotificationFilter): boolean {
    // Filtrar por tipo de usuário
    if (filter.userRole === 'atendente' && complaint.status !== 'nova') {
      return false;
    }

    // Filtrar por tipo de denúncia (se configurado)
    if (filter.complaintsTypes && filter.complaintsTypes.length > 0) {
      if (!filter.complaintsTypes.includes(complaint.occurrence_type)) {
        return false;
      }
    }

    return true;
  }

  private sendNotification(complaint: any) {
    if (!this.notificationHook) return;

    const priority = this.getPriority(complaint);
    const title = this.getNotificationTitle(complaint);
    const body = this.getNotificationBody(complaint);

    this.notificationHook.sendNotification({
      title,
      body,
      complaintId: complaint.id,
      priority,
      sound: true,
      vibration: true,
    });
  }

  private getPriority(complaint: any): 'high' | 'default' | 'low' {
    // Denúncias urgentes = prioridade alta
    const urgentTypes = ['assalto', 'roubo', 'sequestro', 'homicidio'];
    if (urgentTypes.includes(complaint.occurrence_type?.toLowerCase())) {
      return 'high';
    }
    return 'default';
  }

  private getNotificationTitle(complaint: any): string {
    const type = complaint.occurrence_type || 'Denúncia';
    return `🚨 Nova Denúncia: ${type}`;
  }

  private getNotificationBody(complaint: any): string {
    const location = complaint.occurrence_neighborhood || 'Localização não informada';
    const time = new Date(complaint.created_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return `${location} - ${time}`;
  }

  disconnect() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

export const notificationService = new NotificationService();
