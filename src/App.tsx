
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSystemColors } from "@/hooks/useSystemColors";
import { useDevToolsProtection } from "@/hooks/useDevToolsProtection";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { validateDomain, checkIntegrity, initAntiTamper } from "@/utils/codeProtection";
import { logger } from "@/lib/secureLogger";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AtendenteDashboard from "./pages/AtendenteDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import FiscalDashboard from "./pages/FiscalDashboard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  // Carregar e aplicar cores do sistema
  useSystemColors();
  
  // Proteções desativadas temporariamente para debugging
  // useDevToolsProtection();
  
  useEffect(() => {
    console.log('Sistema iniciado com proteções desativadas');
    logger.info('Sistema iniciado');
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/acesso" element={<Login />} />
          <Route 
            path="/atendente" 
            element={
              <ProtectedRoute allowedRoles={['atendente', 'admin', 'super_admin']}>
                <AtendenteDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminDashboard />
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
            path="/fiscal" 
            element={
              <ProtectedRoute allowedRoles={['fiscal', 'admin', 'super_admin']}>
                <FiscalDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
