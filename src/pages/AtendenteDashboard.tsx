import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ComplaintsList } from "@/components/admin/ComplaintsList";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AtendenteDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');

  console.log('📱 ATENDENTE: isLoading:', isLoading, 'profile:', !!profile, 'profile.full_name:', profile?.full_name);

  useEffect(() => {
    if (!isLoading && !profile) {
      console.log('📱 ATENDENTE: No profile, redirecting to /acesso');
      navigate('/acesso');
      return;
    }
    if (profile) {
      console.log('📱 ATENDENTE: Profile loaded:', profile.full_name, 'role:', profile.role);
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
              Painel do Atendente
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
      
      {/* MOBILE CRITICAL: Always visible content area */}
      <div 
        style={{
          padding: '16px',
          width: '100%',
          minHeight: 'calc(100vh - 80px)',
          backgroundColor: 'white'
        }}
      >
        {/* Original React components wrapped in fallback */}
        <div style={{ display: 'block', width: '100%' }}>
          <Header showLoginButton={false} logoUrl={logoUrl} />
          
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-primary">Painel do Atendente</h1>
                <p className="text-muted-foreground">
                  Bem-vindo, {profile?.full_name || 'Carregando...'}
                </p>
              </div>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando denúncias...</p>
              </div>
            ) : (
              <ComplaintsList />
            )}
          </div>
        </div>
        
        {/* MOBILE CRITICAL: Fallback content if React fails */}
        <div style={{ marginTop: '20px', color: '#374151' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Denúncias Recentes
          </h2>
          <div style={{ 
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#f9fafb'
          }}>
            <p style={{ margin: 0, textAlign: 'center', color: '#6b7280' }}>
              {isLoading ? 'Carregando denúncias...' : 'Sistema carregado com sucesso'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}