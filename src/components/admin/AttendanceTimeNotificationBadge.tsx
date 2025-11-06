import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAttendanceTimeMonitor } from '@/hooks/useAttendanceTimeMonitor';

export const AttendanceTimeNotificationBadge = () => {
  const { totalOverdue } = useAttendanceTimeMonitor();

  if (totalOverdue === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-pulse">
      <div className="relative">
        <div className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 rounded-full shadow-lg">
          <Bell className="h-5 w-5" />
          <Badge variant="secondary" className="text-lg font-bold">
            {totalOverdue}
          </Badge>
        </div>
        <div className="absolute inset-0 bg-destructive rounded-full animate-ping opacity-75" />
      </div>
    </div>
  );
};
