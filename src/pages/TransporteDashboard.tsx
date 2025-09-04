import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEscalas } from '@/hooks/useEscalas';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EscalaAtivaCard } from '@/components/motorista/EscalaAtivaCard';
import { EscalaViaturaModal } from '@/components/motorista/EscalaViaturaModal';
import { ImprevistosMotoristaCard } from '@/components/motorista/ImprevistosMotoristaCard';
import { ViaturasManagement } from '@/components/admin/ViaturasManagement';
import { EscalasManagement } from '@/components/admin/EscalasManagement';
import { ChecklistConfigManagement } from '@/components/admin/ChecklistConfigManagement';
import { LogOut, Car, Calendar, Settings, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TransporteDashboard = () => {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const { escalaAtiva, loading: escalasLoading, refetch } = useEscalas();
  const [showEscalaModal, setShowEscalaModal] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const navigate = useNavigate();

  console.log('📱 TRANSPORTE: isLoading:', isLoading, 'profile:', !!profile, 'profile.full_name:', profile?.full_name);

  useEffect(() => {
    const checkAuth = () => {
      if (!isLoading) {
        if (!profile) {
          console.log('📱 TRANSPORTE: No profile, redirecting to /acesso');
          try {
            navigate('/acesso');
          } catch (error) {
            console.error('📱 TRANSPORTE: Navigate failed, using window.location');
            window.location.href = '/acesso';
          }
        } else {
          console.log('📱 TRANSPORTE: Profile confirmed:', profile.full_name, 'role:', profile.role);
        }
      }
    };

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

  const handleEscalaUpdate = () => {
    refetch();
    setShowEscalaModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      
      {/* User Info Bar */}
      <div className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-card-foreground">
                Coordenação de Transporte
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
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <Tabs defaultValue="dashboard" className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max gap-1 bg-muted p-1 rounded-md">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
              </TabsTrigger>
              <TabsTrigger value="viaturas" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Car className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Viaturas</span>
                <span className="sm:hidden">Viat.</span>
              </TabsTrigger>
              <TabsTrigger value="escalas" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Escalas</span>
                <span className="sm:hidden">Escala</span>
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Checklist</span>
                <span className="sm:hidden">Check</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard content similar to motorista */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {!escalasLoading && escalaAtiva && (
                <EscalaAtivaCard 
                  escala={escalaAtiva}
                  onEscalaUpdated={refetch}
                />
              )}
              <ImprevistosMotoristaCard />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription>
                  Acesso rápido às principais funcionalidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setShowEscalaModal(true)}
                  >
                    <Calendar className="h-6 w-6" />
                    <span className="text-xs">Nova Escala</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => navigate('/checklist-viatura')}
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-xs">Checklist</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    disabled
                  >
                    <Car className="h-6 w-6" />
                    <span className="text-xs">Relatórios</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    disabled
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="text-xs">Histórico</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="viaturas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Viaturas</CardTitle>
                <CardDescription>
                  Cadastre e gerencie as viaturas da corporação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ViaturasManagement />
              </CardContent>
            </Card>
            
            <ChecklistConfigManagement />
          </TabsContent>

          <TabsContent value="escalas" className="space-y-6">
            <EscalasManagement />
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <ChecklistConfigManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      {escalaAtiva && (
        <EscalaViaturaModal
          open={showEscalaModal}
          onOpenChange={setShowEscalaModal}
          viaturaId={escalaAtiva.viatura_id}
          viaturaPrefixo={escalaAtiva.viaturas?.prefixo || ''}
          viaturaModelo={escalaAtiva.viaturas?.modelo || ''}
          kmInicial={escalaAtiva.km_inicial}
          motoristaId={profile?.id || ''}
          motoristaNome={profile?.full_name || ''}
          onSuccess={handleEscalaUpdate}
        />
      )}
    </div>
  );
};

export default TransporteDashboard;