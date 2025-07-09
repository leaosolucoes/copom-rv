import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff, Clock, CheckCircle } from "lucide-react";

export const NetworkStatus = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { pendingItems } = useOfflineStorage();

  if (isOnline && pendingItems.length === 0) {
    return null; // Don't show anything when online and no pending items
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Connection Status */}
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-2"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            {isSlowConnection ? "Conexão Lenta" : "Online"}
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>

      {/* Pending Items Alert */}
      {pendingItems.length > 0 && (
        <Alert className="w-80">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {isOnline ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Sincronizando {pendingItems.length} item(s)...</span>
              </div>
            ) : (
              <span>
                {pendingItems.length} denúncia(s) aguardando sincronização.
                Serão enviadas quando a conexão for restabelecida.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};