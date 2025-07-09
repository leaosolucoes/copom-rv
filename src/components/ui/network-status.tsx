import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { OfflineStatusPanel } from "@/components/ui/offline-status-panel";

export const NetworkStatus = () => {
  return (
    <>
      <OfflineStatusPanel />
    </>
  );
};