// Utilitário para gerenciar notificações do navegador

export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export const sendDesktopNotification = async (
  options: DesktopNotificationOptions
): Promise<void> => {
  if (!isNotificationSupported()) {
    console.warn('Notificações não são suportadas neste navegador');
    return;
  }

  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.warn('Permissão de notificações negada');
    return;
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/icon-192.png',
    tag: options.tag,
    requireInteraction: false,
  });

  if (options.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  // Auto-fechar após 10 segundos
  setTimeout(() => {
    notification.close();
  }, 10000);
};
