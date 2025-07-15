
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

  console.log('📱 ADMIN: Component loaded', { isLoading, profile: !!profile });

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

  // HYBRID: CSS inline + React components para garantir funcionamento
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* CSS inline garante que sempre aparece */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', color: '#2d5016', fontSize: '24px' }}>
              Administrador
            </h1>
            <p style={{ margin: '0', color: '#666' }}>
              {isLoading ? 'Carregando perfil...' : `Bem-vindo, ${profile?.full_name || 'Usuário'}`}
            </p>
          </div>
          <button 
            onClick={signOut}
            style={{ 
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
      </div>
      
      {/* Navegação por abas */}
      <div style={{ backgroundColor: 'white', padding: '10px 20px', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#2d5016', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Denúncias
          </button>
          <button 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f5f5f5', 
              color: '#666', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Usuários
          </button>
        </div>
      </div>
      
      {/* Área principal com componentes React */}
      <div style={{ padding: '20px' }}>
        {isLoading ? (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <p>Carregando sistema administrativo...</p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2d5016' }}>Gerenciar Denúncias</h2>
            <ComplaintsList />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
