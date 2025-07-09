import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { OfflineStatusPanel } from "@/components/ui/offline-status-panel";
import { OfflineAnalyticsDashboard } from "@/components/ui/offline-analytics-dashboard";
import { OfflineTestSuite } from "@/components/ui/offline-test-suite";

export const NetworkStatus = () => {
  return (
    <>
      <OfflineStatusPanel />
      <OfflineAnalyticsDashboard />
      <OfflineTestSuite />
    </>
  );
};