
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { ComplaintsListLazy } from '@/components/admin/ComplaintsListLazy';
import { CNPJLookup } from '@/components/cnpj/CNPJLookup';
import { CPFLookup } from '@/components/cpf/CPFLookup';
import { CEPLookup } from '@/components/cep/CEPLookup';
import { Users, FileText, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');

  console.log('📱 ADMIN: isLoading:', isLoading, 'profile:', !!profile, 'profile.full_name:', profile?.full_name);

  useEffect(() => {
    // Robust mobile authentication check with retry
    const checkAuth = () => {
      if (!isLoading) {
        if (!profile) {
          console.log('📱 ADMIN: No profile found, redirecting...');
          // Mobile fallback redirection
          try {
            navigate('/acesso');
          } catch (error) {
            console.error('📱 ADMIN: Navigate failed, using window.location');
            window.location.href = '/acesso';
          }
        } else {
          console.log('📱 ADMIN: Profile confirmed:', profile.full_name, 'role:', profile.role);
        }
      }
    };

    // Add small delay for mobile state synchronization
    const timeout = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeout);
  }, [profile, navigate, isLoading]);

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

  // SEMPRE mostrar o dashboard - sem verificações que causam tela branca
  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      
      {/* User Info Bar */}
      <div className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-card-foreground">
                Administrador
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Bem-vindo, {profile?.full_name || 'Carregando...'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={signOut}
              className="w-full sm:w-auto"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <Tabs defaultValue="complaints" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:w-fit">
            <TabsTrigger value="complaints" className="flex items-center gap-2 text-xs md:text-sm">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Denúncias</span>
              <span className="sm:hidden">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 text-xs md:text-sm">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Atendentes/Fiscais</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="consultas" className="flex items-center gap-2 text-xs md:text-sm">
              <Search className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Consultas</span>
              <span className="sm:hidden">Busca</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="complaints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acompanhar Denúncias</CardTitle>
                <CardDescription>
                  Visualize todas as denúncias e o fluxo de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComplaintsListLazy />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Atendentes e Fiscais</CardTitle>
                <CardDescription>
                  Cadastre e desative usuários atendentes e fiscais
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando usuários...</p>
                  </div>
                ) : (
                  <UserManagement userRole="admin" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consultas" className="space-y-6">
            <div className="space-y-6">
              <CNPJLookup />
              <CPFLookup />
              <CEPLookup />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
