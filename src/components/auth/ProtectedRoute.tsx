import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { logger } from '@/lib/secureLogger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/login' 
}: ProtectedRouteProps) => {
  const { isAuthenticated, hasRole, isLoading, profile } = useSupabaseAuth();

  // Security logs for authentication tracking
  useEffect(() => {
    logger.debug('🛡️ ProtectedRoute state:', {
      isLoading,
      isAuthenticated,
      profile: profile?.role,
      allowedRoles
    });
  }, [isLoading, isAuthenticated, profile, allowedRoles]);

  // Removed mobile timeout that was causing auto-logout

  // Show loading while checking authentication
  if (isLoading) {
    logger.debug('🔄 ProtectedRoute showing loading screen...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
          <p className="text-xs text-muted-foreground mt-2">Mobile: {navigator.userAgent.includes('Mobile') ? 'Sim' : 'Não'}</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    logger.warn('❌ User not authenticated, redirecting to login');
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user has required role
  if (!hasRole(allowedRoles)) {
    logger.warn('🚫 User does not have required role:', { userRole: profile?.role, requiredRoles: allowedRoles });
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

  logger.debug('✅ ProtectedRoute allowing access');
  return <>{children}</>;
};