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
          <p className="text-muted-foreground">Verificando acesso...</p>
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
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Acesso Negado
          </h1>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-muted-foreground">
            Seu nível de acesso: <strong>{profile?.role}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Níveis requeridos: <strong>{allowedRoles.join(', ')}</strong>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Domain validation for additional security
const validateDomain = () => {
  const allowedDomains = [
    'posturas.conectarioverde.com.br',
    'localhost',
    '127.0.0.1'
  ];
  
  // Allow Lovable domains for development
  const hostname = window.location.hostname;
  const isLovableDomain = hostname.includes('lovableproject.com') || hostname.includes('lovable.app');
  
  if (!allowedDomains.includes(hostname) && !isLovableDomain) {
    throw new Error('Domínio não autorizado');
  }
};

// Run domain validation
if (typeof window !== 'undefined') {
  validateDomain();
}