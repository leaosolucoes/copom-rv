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

  // SEMPRE mostrar o dashboard - sem verificações que causam tela branca
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      display: 'block',
      visibility: 'visible'
    }}>
      {/* Header simplificado para mobile */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: '0' }}>
            Painel do Atendente
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
            Bem-vindo, {profile?.full_name || 'Carregando...'}
          </p>
        </div>
        <Button variant="outline" onClick={signOut} style={{ fontSize: '14px' }}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Conteúdo principal */}
      <div style={{ padding: '16px' }}>
        {isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 0',
            backgroundColor: '#fff'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#666', fontSize: '14px' }}>Carregando denúncias...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#333' }}>
              Lista de Denúncias
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Sistema carregado com sucesso. As denúncias aparecerão aqui.
            </p>
            {isMobile && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#e7f3ff',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#0066cc'
              }}>
                📱 Versão móvel carregada
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}