import { useState, useEffect, useRef } from 'react';
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
import { CaptchaVerification, CaptchaVerificationRef } from '@/components/auth/CaptchaVerification';
import { LoginAttemptsManager } from '@/utils/loginAttempts';

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
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const captchaRef = useRef<CaptchaVerificationRef>(null);

  // Mobile-optimized authentication redirection
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      console.log('🔐 AUTH: Authenticated user confirmed:', profile.full_name, 'role:', profile.role);
      console.log('📱 Starting redirection process...');
      
      const routes: Record<string, string> = {
        'super_admin': '/super-admin',
        'admin': '/admin', 
        'atendente': '/atendente',
        'fiscal': '/fiscal'
      };
      
      const targetRoute = routes[profile.role] || '/atendente';
      console.log('📱 Redirecting to:', targetRoute);
      
      // Força redirecionamento imediato
      setTimeout(() => {
        window.location.href = targetRoute;
      }, 100);
    }
  }, [isAuthenticated, profile, authLoading]);


  // Verificar tentativas ao carregar
  useEffect(() => {
    const checkAttempts = () => {
      const locked = LoginAttemptsManager.isLocked();
      const shouldShow = LoginAttemptsManager.shouldShowCaptcha();
      
      setIsLocked(locked);
      setShowCaptcha(shouldShow);
      
      if (locked) {
        setLockTimeRemaining(LoginAttemptsManager.getLockedTimeRemaining());
      }
    };

    checkAttempts();

    // Atualizar a cada segundo se estiver bloqueado
    const interval = setInterval(() => {
      if (LoginAttemptsManager.isLocked()) {
        setLockTimeRemaining(LoginAttemptsManager.getLockedTimeRemaining());
      } else {
        setIsLocked(false);
        setLockTimeRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaError = () => {
    setError('Erro ao verificar CAPTCHA. Tente novamente.');
    setCaptchaToken(null);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Verificar se está bloqueado
    if (LoginAttemptsManager.isLocked()) {
      setError(LoginAttemptsManager.getErrorMessage());
      return;
    }

    // Verificar CAPTCHA se necessário
    if (showCaptcha && !captchaToken) {
      setError('Por favor, complete a verificação CAPTCHA');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('📱 MOBILE LOGIN: Iniciando processo de autenticação...', { isMobile });
      
      const result = await signIn(email.toLowerCase().trim(), password);
      
      if (result?.error) {
        console.log('❌ MOBILE LOGIN: Erro na autenticação:', result.error);
        
        // Registrar tentativa falhada
        LoginAttemptsManager.recordFailedAttempt();
        
        // Verificar se agora deve mostrar CAPTCHA
        if (LoginAttemptsManager.shouldShowCaptcha()) {
          setShowCaptcha(true);
        }

        // Verificar se foi bloqueado
        if (LoginAttemptsManager.isLocked()) {
          setIsLocked(true);
          setLockTimeRemaining(LoginAttemptsManager.getLockedTimeRemaining());
        }

        setError(LoginAttemptsManager.getErrorMessage());
        
        // Resetar CAPTCHA se houver
        if (captchaRef.current) {
          captchaRef.current.reset();
          setCaptchaToken(null);
        }
        
        setLoading(false);
        return;
      }

      console.log('✅ MOBILE LOGIN: SignIn successful, iniciando verificação...');
      
      // Login bem-sucedido - resetar tentativas
      LoginAttemptsManager.reset();
      setShowCaptcha(false);
      setCaptchaToken(null);
      
      // Aguardar sincronização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar se o profile foi carregado
      const storedProfile = localStorage.getItem('custom_profile');
      console.log('📱 Profile no localStorage:', storedProfile);
      
      if (storedProfile) {
        const profileData = JSON.parse(storedProfile);
        console.log('📱 Profile carregado:', profileData);
      }
      
      setLoading(false);
      
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

              {isLocked && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-sm">
                    Muitas tentativas falhadas. Aguarde {Math.floor(lockTimeRemaining / 60)}:
                    {(lockTimeRemaining % 60).toString().padStart(2, '0')} para tentar novamente.
                  </AlertDescription>
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
                  disabled={loading || isLocked}
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
                  disabled={loading || isLocked}
                  autoComplete="current-password"
                />
              </div>

              {showCaptcha && !isLocked && (
                <CaptchaVerification
                  ref={captchaRef}
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  onExpire={handleCaptchaExpire}
                />
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || isLocked || (showCaptcha && !captchaToken)}
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

              {showCaptcha && (
                <p className="text-xs text-center text-muted-foreground">
                  Após 3 tentativas falhadas, é necessário verificar que você não é um robô.
                </p>
              )}
              
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;