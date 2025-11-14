import { LocalNotifications } from '@capacitor/local-notifications';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationOptions {
  title: string;
  body: string;
  complaintId?: string;
  priority?: 'high' | 'default' | 'low';
  sound?: boolean;
  vibration?: boolean;
  notificationHistoryId?: string;
}

export const usePushNotifications = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    try {
      // 1. Verificar e solicitar permissões
      const permission = await LocalNotifications.checkPermissions();
      
      if (permission.display === 'prompt') {
        const result = await LocalNotifications.requestPermissions();
        setPermissionGranted(result.display === 'granted');
      } else {
        setPermissionGranted(permission.display === 'granted');
      }

      // 2. Criar canal de notificação (Android)
      await LocalNotifications.createChannel({
        id: 'complaints-alerts',
        name: 'Alertas de Denúncias',
        description: 'Notificações de novas denúncias no sistema',
        importance: 5, // Max importance
        visibility: 1, // Public
        sound: 'notification_sound.wav',
        vibration: true,
        lights: true,
        lightColor: '#FF0000',
      });

      // 3. Listener para clique na notificação
      await LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
        const complaintId = notification.notification.extra?.complaintId;
        const notificationHistoryId = notification.notification.extra?.notificationHistoryId;
        
        // Registrar abertura no histórico
        if (notificationHistoryId) {
          try {
            await supabase
              .from('notification_history')
              .update({ 
                opened_at: new Date().toISOString(),
                device_info: {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  timestamp: Date.now()
                }
              })
              .eq('id', notificationHistoryId);
          } catch (error) {
            console.error('Erro ao registrar abertura:', error);
          }
        }
        
        if (complaintId) {
          // Navegar para detalhes da denúncia
          window.location.href = `/admin?complaint=${complaintId}`;
        }
        
        // Limpar badge
        LocalNotifications.removeAllDeliveredNotifications();
        setNotificationCount(0);
      });
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
    }
  };

  const sendNotification = async (options: NotificationOptions) => {
    if (!permissionGranted) {
      console.warn('Permissão de notificação negada');
      return;
    }

    const newCount = notificationCount + 1;
    setNotificationCount(newCount);

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: options.title,
            body: options.body,
            channelId: 'complaints-alerts',
            sound: options.sound ? 'notification_sound.wav' : undefined,
            smallIcon: 'res://drawable/ic_stat_notification',
            iconColor: '#1e3a8a',
            extra: {
              complaintId: options.complaintId,
              notificationHistoryId: options.notificationHistoryId,
            },
            schedule: { at: new Date(Date.now() + 1000) },
            summaryText: `${newCount} denúncias pendentes`,
          },
        ],
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await LocalNotifications.removeAllDeliveredNotifications();
      setNotificationCount(0);
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  return {
    permissionGranted,
    notificationCount,
    sendNotification,
    clearAllNotifications,
  };
};
