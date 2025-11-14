import { Bell, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationBadge = () => {
  const { notificationCount, clearAllNotifications } = usePushNotifications();

  if (notificationCount === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50">
      <div className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg animate-pulse">
        <Bell className="h-5 w-5" />
        <Badge variant="secondary" className="text-lg font-bold">
          {notificationCount}
        </Badge>
        <span className="text-sm font-medium">
          {notificationCount === 1 ? 'nova denúncia' : 'novas denúncias'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={clearAllNotifications}
          className="ml-2 hover:bg-destructive-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
