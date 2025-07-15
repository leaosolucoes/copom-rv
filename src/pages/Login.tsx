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

  // MOBILE IMMEDIATE CHECK - Antes mesmo do useEffect de autenticação
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('📱 MOBILE: Checking stored auth immediately...');
      
      const storedSession = localStorage.getItem('custom_session');
      const storedProfile = localStorage.getItem('custom_profile');
      
      if (storedSession && storedProfile) {
        try {
          const session = JSON.parse(storedSession);
          const profile = JSON.parse(storedProfile);
          
          // Verificar se a sessão não expirou
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at > now) {
            console.log('📱 MOBILE: Valid session found, redirecting immediately');
            
            switch (profile.role) {
              case 'super_admin':
                window.location.replace('/super-admin');
                return;
              case 'admin':
                window.location.replace('/admin');
                return;
              case 'atendente':
                window.location.replace('/atendente');
                return;
              case 'fiscal':
                window.location.replace('/fiscal');
                return;
            }
          } else {
            console.log('📱 MOBILE: Session expired, clearing');
            localStorage.removeItem('custom_session');
            localStorage.removeItem('custom_profile');
          }
        } catch (error) {
          console.error('📱 MOBILE: Error checking stored session:', error);
          localStorage.removeItem('custom_session');
          localStorage.removeItem('custom_profile');
        }
      }
    }
  }, []); // Executar IMEDIATAMENTE

  // Hook de autenticação normal
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      console.log('📱 AUTH: Starting redirect for', profile.full_name, 'with role:', profile.role);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log('📱 MOBILE: Force redirecting with window.location.replace');
        
        switch (profile.role) {
          case 'super_admin':
            window.location.replace('/super-admin');
            break;
          case 'admin':
            window.location.replace('/admin');
            break;
          case 'atendente':
            window.location.replace('/atendente');
            break;
          case 'fiscal':
            window.location.replace('/fiscal');
            break;
          default:
            window.location.replace('/');
        }
      } else {
        // Desktop usa React Router
        switch (profile.role) {
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
    }
  }, [isAuthenticated, profile, navigate, authLoading]);


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
      console.log('📱 MOBILE: Starting login process...');
      const { error } = await signIn(email.toLowerCase().trim(), password);
      
      if (error) {
        setError('Email ou senha incorretos');
      } else {
        console.log('📱 MOBILE: Login successful, redirect handled by useEffect');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
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
              
              {/* Debug button for mobile testing */}
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const debugInfo = {
                    isAuthenticated,
                    profileRole: profile?.role,
                    authLoading,
                    userAgent: navigator.userAgent,
                    localStorageSession: !!localStorage.getItem('custom_session'),
                    localStorageProfile: !!localStorage.getItem('custom_profile')
                  };
                  alert('Debug Info: ' + JSON.stringify(debugInfo, null, 2));
                }}
              >
                Debug Info
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