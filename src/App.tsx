import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
