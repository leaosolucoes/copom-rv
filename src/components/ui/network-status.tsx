import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Clock, CheckCircle, RefreshCw } from "lucide-react";

export const NetworkStatus = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { isSyncing, pendingCount, retrySyncAll } = useSyncQueue();

  if (isOnline && pendingCount === 0) {
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
      {pendingCount > 0 && (
        <Alert className="w-80">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {isOnline ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                      <span>Sincronizando {pendingCount} item(s)...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{pendingCount} item(s) na fila</span>
                    </>
                  )}
                </div>
                {!isSyncing && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={retrySyncAll}
                    className="ml-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : (
              <span>
                {pendingCount} denúncia(s) aguardando sincronização.
                Serão enviadas quando a conexão for restabelecida.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};