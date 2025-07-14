import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PWAInstallButton } from '@/components/PWAInstallButton';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, profile, isLoading: authLoading } = useSupabaseAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      console.log('🔄 Redirecting user with role:', profile.role);
      const userRole = profile.role;
      const activeUserRole = profile.user_roles?.find(
        role => role.is_active && (!role.expires_at || new Date(role.expires_at) > new Date())
      );
      
      const currentRole = activeUserRole?.role || userRole;
      
      switch (currentRole) {
        case 'super_admin':
          navigate('/super-admin', { replace: true });
          break;
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'atendente':
          navigate('/atendente', { replace: true });
          break;
        case 'fiscal':
          navigate('/fiscal', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, profile, navigate, authLoading]);

  // Safety timeout to prevent infinite loading on mobile
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (authLoading) {
        console.log('⚠️ Safety timeout reached, stopping loading state');
        // Force re-check authentication state
        window.location.reload();
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(safetyTimeout);
  }, [authLoading]);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'public_logo_url')
          .maybeSingle();

        if (error) throw error;
        
        if (data?.value) {
          setLogoUrl(data.value as string);
        }
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }
    };

    fetchLogo();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email.toLowerCase().trim(), password);
      
      if (error) {
        setError('Email ou senha incorretos');
      }
      // Navigation will be handled by useEffect above
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      
      <main className="flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Acesso Interno
            </CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                variant="government"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar no Sistema
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <PWAInstallButton />
    </div>
  );
};

export default Login;