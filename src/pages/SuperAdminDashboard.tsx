
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { ComplaintsList } from '@/components/admin/ComplaintsList';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { WhatsAppConfig } from '@/components/admin/WhatsAppConfig';
import { FormFieldsConfig } from '@/components/admin/FormFieldsConfig';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { OccurrenceTypesConfig } from '@/components/admin/OccurrenceTypesConfig';
import { SoundNotificationControl } from '@/components/admin/SoundNotificationControl';
import { ApiManagement } from '@/components/admin/ApiManagement';
import { Users, FileText, Settings, MessageSquare, Layout, Image, List, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SuperAdminDashboard = () => {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');

  console.log('📱 SUPER_ADMIN: isLoading:', isLoading, 'profile:', !!profile, 'profile.full_name:', profile?.full_name);

  useEffect(() => {
    if (!isLoading && !profile) {
      console.log('📱 SUPER_ADMIN: No profile, redirecting to /acesso');
      navigate('/acesso');
      return;
    }
    if (profile) {
      console.log('📱 SUPER_ADMIN: Profile loaded:', profile.full_name, 'role:', profile.role);
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
      <Header 
        showLoginButton={false} 
        logoUrl={logoUrl}
      />
      
      {/* User Info Bar */}
      <div className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-card-foreground">
                Super Administrador
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
          <div className="overflow-x-auto">
            <TabsList className="flex w-max md:grid md:grid-cols-8 md:w-fit gap-1">
              <TabsTrigger value="complaints" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Denúncias</span>
                <span className="sm:hidden">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Usuários</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Zap</span>
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Layout className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Formulário</span>
                <span className="sm:hidden">Form</span>
              </TabsTrigger>
              <TabsTrigger value="logo" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Image className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Logo</span>
                <span className="sm:hidden">Logo</span>
              </TabsTrigger>
              <TabsTrigger value="occurrence-types" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <List className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Tipos</span>
                <span className="sm:hidden">Tipos</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Code className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">API</span>
                <span className="sm:hidden">API</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Config</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="complaints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Denúncias</CardTitle>
                <CardDescription>
                  Visualize, exporte e gerencie todas as denúncias do sistema
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
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Cadastre, edite e desative usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração WhatsApp</CardTitle>
                <CardDescription>
                  Configure a integração com Evolution API para envio automático de mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WhatsAppConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Formulário</CardTitle>
                <CardDescription>
                  Gerencie quais campos aparecem no formulário público de denúncias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormFieldsConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo do Sistema</CardTitle>
                <CardDescription>
                  Faça upload e configure a logo que aparecerá em todas as telas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUpload onLogoUpdate={setLogoUrl} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occurrence-types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Ocorrência</CardTitle>
                <CardDescription>
                  Configure os tipos de ocorrência disponíveis no formulário público de denúncias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OccurrenceTypesConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de API</CardTitle>
                <CardDescription>
                  Configure tokens, monitore uso e gerencie a API completa do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Configurações avançadas do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SystemSettings />
                </CardContent>
              </Card>
              
              <SoundNotificationControl />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
