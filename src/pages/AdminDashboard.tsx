
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
              Painel do Administrador
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
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            Denúncias
          </button>
          <button style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            Atendentes
          </button>
        </div>
      </div>
      
      {/* MOBILE CRITICAL: Always visible content area */}
      <div 
        style={{
          padding: '16px',
          width: '100%',
          minHeight: 'calc(100vh - 140px)',
          backgroundColor: 'white'
        }}
      >
        {/* Original React components wrapped in fallback */}
        <div style={{ display: 'block', width: '100%' }}>
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
        
        {/* MOBILE CRITICAL: Fallback content if React fails */}
        <div style={{ marginTop: '20px', color: '#374151' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Sistema Administrativo
          </h2>
          <div style={{ 
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#f9fafb'
          }}>
            <p style={{ margin: 0, textAlign: 'center', color: '#6b7280' }}>
              {isLoading ? 'Carregando sistema...' : 'Painel administrativo carregado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
