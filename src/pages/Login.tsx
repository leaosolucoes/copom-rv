
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Tentando fazer login com:', { email });

      // Buscar usuário e verificar senha
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true);

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        throw new Error('Erro interno do sistema');
      }

      if (!users || users.length === 0) {
        console.log('Usuário não encontrado ou inativo');
        throw new Error('Usuário não encontrado ou inativo');
      }

      const user = users[0];
      console.log('Usuário encontrado:', { id: user.id, email: user.email, role: user.role });

      // Verificar senha
      const { data: passwordValid, error: passwordError } = await supabase
        .rpc('verify_password', {
          password: password,
          hash: user.password_hash
        });

      if (passwordError) {
        console.error('Erro ao verificar senha:', passwordError);
        throw new Error('Erro interno do sistema');
      }

      if (!passwordValid) {
        console.log('Senha inválida');
        throw new Error('Senha incorreta');
      }

      console.log('Login bem-sucedido');

      // Atualizar último login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Salvar usuário no localStorage
      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      };
      
      localStorage.setItem('user', JSON.stringify(userData));

      // Redirecionar baseado no papel
      switch (user.role) {
        case 'super_admin':
          window.location.href = '/super-admin';
          break;
        case 'admin':
          window.location.href = '/admin';
          break;
        case 'atendente':
          window.location.href = '/atendente';
          break;
        default:
          window.location.href = '/atendente';
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} />
      
      <main className="flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
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
