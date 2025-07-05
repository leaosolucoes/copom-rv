import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verificar credenciais na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      // Verificar senha usando função do banco
      const { data: passwordCheck, error: passwordError } = await supabase
        .rpc('verify_password', {
          password: password,
          hash: userData.password_hash
        });

      if (passwordError || !passwordCheck) {
        throw new Error('Senha incorreta');
      }

      // Atualizar último login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      // Armazenar dados do usuário no localStorage
      localStorage.setItem('user', JSON.stringify({
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role
      }));

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${userData.full_name}`,
      });

      // Redirecionar baseado no papel do usuário
      switch (userData.role) {
        case 'super_admin':
          navigate('/admin');
          break;
        case 'admin':
          navigate('/admin');
          break;
        case 'atendente':
          navigate('/atendente');
          break;
        default:
          navigate('/');
      }

    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: error instanceof Error ? error.message : "Credenciais inválidas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} />
      
      <main className="flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md shadow-form">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Acesso Interno
            </CardTitle>
            <p className="text-muted-foreground">
              Sistema Posturas Rio Verde
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail / Login</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu login"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                variant="government"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Entrando..."
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Para solicitar acesso, entre em contato com o administrador</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}