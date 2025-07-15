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

  console.log('📱 ATENDENTE: Component loaded', { isLoading, profile: !!profile });

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

  // FALLBACK VISUAL SEMPRE VISÍVEL
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#2d5016' }}>Painel do Atendente</h1>
        <p style={{ margin: '0', color: '#666' }}>
          {isLoading ? 'Carregando perfil...' : `Bem-vindo, ${profile?.full_name || 'Usuário'}`}
        </p>
        <button 
          onClick={signOut}
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#2d5016', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sair
        </button>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#2d5016' }}>Sistema de Denúncias</h2>
        {isLoading ? (
          <p>Carregando dados...</p>
        ) : (
          <div>
            <p>Status: Sistema funcionando</p>
            <p>Perfil: {profile?.role || 'Não definido'}</p>
            <p>Email: {profile?.email || 'Não definido'}</p>
          </div>
        )}
      </div>
    </div>
  );
}