
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSystemColors } from "@/hooks/useSystemColors";
import { useDevToolsProtection } from "@/hooks/useDevToolsProtection";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { validateDomain, checkIntegrity, initAntiTamper } from "@/utils/codeProtection";
import { logger } from "@/lib/secureLogger";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AtendenteDashboard from "./pages/AtendenteDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import FiscalDashboard from "./pages/FiscalDashboard";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  // Log de inicialização para debug em produção
  console.log('🚀 App iniciando...', {
    env: process.env.NODE_ENV,
    hostname: window.location.hostname,
    timestamp: new Date().toISOString()
  });
  
  // Carregar e aplicar cores do sistema
  useSystemColors();
  
  // Proteções ativadas para produção
  useDevToolsProtection();
  
  // Monitoramento de performance
  usePerformanceMonitor();
  
  useEffect(() => {
    console.log('✅ App montado com sucesso');
    
    // Tratamento de erros global
    const handleError = (event: ErrorEvent) => {
      console.error('❌ Erro global capturado:', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('❌ Promise rejeitada não tratada:', event.reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Production security initialization - simplified for stability
    const initSecurity = async () => {
      try {
        logger.info("Sistema iniciado com proteções básicas");
        
        // Only initialize anti-tamper without aggressive checks
        const cleanup = initAntiTamper();
        
        return cleanup;
      } catch (error) {
        logger.error("Erro não crítico na inicialização", error);
        // Don't redirect on errors - let the app continue
      }
    };
    
    initSecurity();
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <SecurityProvider>
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
          <Route 
            path="/diagnostico" 
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SystemDiagnostics />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </SecurityProvider>
  </QueryClientProvider>
);
};

export default App;
