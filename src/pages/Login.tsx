import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, profile, isLoading: authLoading } = useSupabaseAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Mobile-optimized authentication redirection
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      console.log('🔐 AUTH: Authenticated user confirmed:', profile.full_name, 'role:', profile.role);
      console.log('📱 MOBILE: Starting redirection process...');
      
      // Add delay for mobile state synchronization
      const redirectToRole = () => {
        const routes = {
          'super_admin': '/super-admin',
          'admin': '/admin', 
          'atendente': '/atendente',
          'fiscal': '/fiscal'
        };
        
        const targetRoute = routes[profile.role as keyof typeof routes] || '/';
        console.log('📱 MOBILE: Redirecting to:', targetRoute);
        
        try {
          navigate(targetRoute, { replace: true });
          console.log('✅ MOBILE: React Router navigation attempted');
        } catch (error) {
          console.error('❌ MOBILE: React Router failed, using window.location');
          window.location.href = targetRoute;
        }
      };

      // Mobile-specific delay for state synchronization
      const delay = isMobile ? 1000 : 100;
      
      setTimeout(redirectToRole, delay);
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
      console.log('📱 MOBILE LOGIN: Iniciando processo de autenticação...', { isMobile });
      
      const result = await signIn(email.toLowerCase().trim(), password);
      
      if (result?.error) {
        console.log('❌ MOBILE LOGIN: Erro na autenticação:', result.error);
        setError('Email ou senha incorretos');
        setLoading(false);
        return;
      }

      console.log('✅ MOBILE LOGIN: SignIn successful, iniciando verificação...');
      
      // Para mobile, forçar verificação manual do localStorage
      if (isMobile) {
        console.log('📱 MOBILE LOGIN: Aguardando sincronização mobile...');
        
        // Aguardar mais tempo para mobile
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar localStorage diretamente
        const storedProfile = localStorage.getItem('custom_profile');
        const storedSession = localStorage.getItem('custom_session');
        
        if (storedProfile && storedSession) {
          const profileData = JSON.parse(storedProfile);
          console.log('📱 MOBILE LOGIN: Profile encontrado no localStorage:', profileData);
          
          // Navegar diretamente baseado no localStorage
          const routes = {
            'super_admin': '/super-admin',
            'admin': '/admin', 
            'atendente': '/atendente',
            'fiscal': '/fiscal'
          };
          
          const targetRoute = routes[profileData.role as keyof typeof routes] || '/';
          console.log('📱 MOBILE LOGIN: Redirecionando para:', targetRoute);
          
          try {
            navigate(targetRoute, { replace: true });
            console.log('✅ MOBILE LOGIN: Navegação React Router executada');
          } catch (navError) {
            console.error('❌ MOBILE LOGIN: React Router falhou, usando window.location');
            window.location.href = targetRoute;
          }
          
          setLoading(false);
          return;
        } else {
          console.log('⚠️ MOBILE LOGIN: Dados não encontrados no localStorage');
        }
      }
      
      // Fallback para desktop ou se mobile falhar
      console.log('💻 DESKTOP LOGIN: Aguardando useEffect redirection...');
      setTimeout(() => {
        if (loading) {
          console.log('⚠️ LOGIN: Timeout atingido, limpando loading');
          setLoading(false);
        }
      }, 4000);
      
    } catch (error: any) {
      console.error('💥 LOGIN: Erro inesperado:', error);
      setError('Erro ao fazer login');
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
    </div>
  );
};

export default Login;