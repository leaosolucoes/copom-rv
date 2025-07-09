import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { OfflineStatusPanel } from "@/components/ui/offline-status-panel";
import { OfflineAnalyticsDashboard } from "@/components/ui/offline-analytics-dashboard";

export const NetworkStatus = () => {
  return (
    <>
      <OfflineStatusPanel />
      <OfflineAnalyticsDashboard />
    </>
  );
};