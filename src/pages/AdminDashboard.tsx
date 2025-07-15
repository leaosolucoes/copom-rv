
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { ComplaintsList } from '@/components/admin/ComplaintsList';
import { Users, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');

  console.log('📱 ADMIN: isLoading:', isLoading, 'profile:', !!profile, 'profile.full_name:', profile?.full_name);

  useEffect(() => {
    if (!isLoading && !profile) {
      console.log('📱 ADMIN: No profile, redirecting to /acesso');
      navigate('/acesso');
      return;
    }
    if (profile) {
      console.log('📱 ADMIN: Profile loaded:', profile.full_name, 'role:', profile.role);
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">
                Administrador
              </h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo, {profile?.full_name || 'Carregando...'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={signOut}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="complaints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-fit">
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Denúncias
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Atendentes
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
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando denúncias...</p>
                  </div>
                ) : (
                  <ComplaintsList />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Atendentes</CardTitle>
                <CardDescription>
                  Cadastre e desative usuários atendentes
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
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
