
import { useState, useEffect } from 'react';
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
import { SoundNotificationControl } from '@/components/admin/SoundNotificationControl';
import { Users, FileText, Settings, MessageSquare, Layout, Image } from 'lucide-react';

const SuperAdminDashboard = () => {
  const { profile, signOut, hasRole, isLoading } = useSupabaseAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    // Só redirecionar se não estiver carregando e realmente não tiver permissão
    if (!isLoading && (!profile || !hasRole(['super_admin']))) {
      window.location.href = '/acesso';
    }
  }, [profile, hasRole, isLoading]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile || !hasRole(['super_admin'])) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        showLoginButton={false} 
        logoUrl={logoUrl}
      />
      
      {/* User Info Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Super Administrador
              </h1>
              <p className="text-sm text-gray-600">
                Bem-vindo, {profile.full_name}
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
          <TabsList className="grid w-full grid-cols-6 lg:w-fit">
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Denúncias</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="form" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Formulário</span>
            </TabsTrigger>
            <TabsTrigger value="logo" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Logo</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="complaints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Denúncias</CardTitle>
                <CardDescription>
                  Visualize, exporte e gerencie todas as denúncias do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComplaintsList userRole="super_admin" />
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
