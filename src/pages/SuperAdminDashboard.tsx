
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

  console.log('📱 SUPER_ADMIN: Component loaded', { isLoading, profile: !!profile });

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

  // FALLBACK VISUAL SEMPRE VISÍVEL
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#2d5016' }}>Super Administrador</h1>
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
        <h2 style={{ margin: '0 0 15px 0', color: '#2d5016' }}>Painel Super Administrador</h2>
        {isLoading ? (
          <p>Carregando dados...</p>
        ) : (
          <div>
            <p>Status: Sistema funcionando</p>
            <p>Perfil: {profile?.role || 'Não definido'}</p>
            <p>Email: {profile?.email || 'Não definido'}</p>
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Funcionalidades Disponíveis:</h3>
              <ul>
                <li>Gerenciar todas as denúncias</li>
                <li>Gerenciar todos os usuários</li>
                <li>Configurar WhatsApp</li>
                <li>Configurar formulários</li>
                <li>Gerenciar logos e identidade</li>
                <li>API Management</li>
                <li>Configurações avançadas</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
