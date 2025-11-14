import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AtendenteDashboard from "./pages/AtendenteDashboard";
import FiscalDashboard from "./pages/FiscalDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import ValidarDenuncia from "./pages/ValidarDenuncia";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SecurityProvider } from "./components/security/SecurityProvider";
import { SecurityHeaders } from "./components/security/SecurityHeaders";
import { useDevToolsProtection } from "./hooks/useDevToolsProtection";
import { OfflineIndicator } from "./components/offline/OfflineIndicator";
import { offlineStorage } from "./utils/offlineStorage";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const AppContent = () => {
  // Hook de proteção DevTools
  useDevToolsProtection();

  // Inicializar storage offline
  useEffect(() => {
    offlineStorage.init();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/atendente"
          element={
            <ProtectedRoute allowedRoles={['atendente', 'admin', 'super_admin']}>
              <AtendenteDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fiscal"
          element={
            <ProtectedRoute allowedRoles={['fiscal', 'admin', 'super_admin']}>
              <FiscalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diagnostico"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SystemDiagnostics />
            </ProtectedRoute>
          }
        />
        <Route path="/validar" element={<ValidarDenuncia />} />
        <Route path="/validar/:protocolo" element={<ValidarDenuncia />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <SecurityProvider>
          <SecurityHeaders />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <AppContent />
          </TooltipProvider>
        </SecurityProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
