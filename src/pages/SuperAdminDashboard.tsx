
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

  // MOBILE ABSOLUTE FALLBACK - SEMPRE mostrar conteúdo
  return (
    <div 
      className="min-h-screen bg-background"
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {/* MOBILE CRITICAL: Always visible header */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e5e5',
          padding: '16px',
          zIndex: 1000
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>
              Super Administrador
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              Bem-vindo, {profile?.full_name || 'Carregando...'}
            </p>
          </div>
          <button 
            onClick={signOut}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Sair
          </button>
        </div>
      </div>
      
      {/* MOBILE CRITICAL: Navigation tabs */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #e5e5e5',
        backgroundColor: '#f9fafb',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', gap: '8px', minWidth: '600px' }}>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            Denúncias
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            Usuários
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            WhatsApp
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            Form
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            Logo
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            Tipos
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            API
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            Config
          </button>
        </div>
      </div>
      
      {/* MOBILE CRITICAL: Always visible content area */}
      <div 
        style={{
          padding: '16px',
          width: '100%',
          minHeight: 'calc(100vh - 160px)',
          backgroundColor: 'white'
        }}
      >
        {/* Original React components wrapped in fallback */}
        <div style={{ display: 'block', width: '100%' }}>
          <Header 
            showLoginButton={false} 
            logoUrl={logoUrl}
          />
          
          {/* User Info Bar */}
          <div className="bg-card border-b shadow-sm">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-card-foreground">
                    Super Administrador
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
              <TabsList className="grid w-full grid-cols-8 lg:w-fit">
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
                <TabsTrigger value="occurrence-types" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Tipos</span>
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span className="hidden sm:inline">API</span>
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
        
        {/* MOBILE CRITICAL: Fallback content if React fails */}
        <div style={{ marginTop: '20px', color: '#374151' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Super Administrador
          </h2>
          <div style={{ 
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#f9fafb'
          }}>
            <p style={{ margin: 0, textAlign: 'center', color: '#6b7280' }}>
              {isLoading ? 'Carregando sistema...' : 'Painel super admin carregado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
