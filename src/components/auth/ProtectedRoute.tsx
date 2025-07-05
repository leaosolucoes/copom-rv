import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/acesso' 
}: ProtectedRouteProps) => {
  const { isAuthenticated, hasRole, isLoading, profile } = useSupabaseAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user has required role
  if (!hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-gray-500">
            Seu nível de acesso: <strong>{profile?.role}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Níveis requeridos: <strong>{allowedRoles.join(', ')}</strong>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Domain validation for anti-copy protection
const validateDomain = () => {
  const allowedDomains = [
    'localhost',
    '127.0.0.1',
    '.lovableproject.com',
    'posturas.rioverde.go.gov.br',
    '.rioverde.go.gov.br'
  ];
  
  const currentDomain = window.location.hostname;
  const isValidDomain = allowedDomains.some(domain => 
    currentDomain === domain || currentDomain.endsWith(domain)
  );
  
  if (!isValidDomain) {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
        <div style="text-align: center;">
          <h1>🚫 Domínio Não Autorizado</h1>
          <p>Este sistema só pode ser executado em domínios autorizados.</p>
          <p>Entre em contato com o administrador do sistema.</p>
        </div>
      </div>
    `;
    throw new Error('Domínio não autorizado');
  }
};

// Run domain validation
if (typeof window !== 'undefined') {
  validateDomain();
}