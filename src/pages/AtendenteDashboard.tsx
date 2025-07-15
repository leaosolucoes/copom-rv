import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ComplaintsList } from "@/components/admin/ComplaintsList";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AtendenteDashboard() {
  const { profile, signOut, isLoading, hasRole } = useSupabaseAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');

  // MOBILE FORCE CHECK - Verificação imediata
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('📱 ATENDENTE MOBILE CHECK:', { isMobile, isLoading, profile: !!profile });

    // Se é mobile e não está carregando, força verificação
    if (isMobile && !isLoading) {
      // Verifica localStorage primeiro para mobile
      const storedSession = localStorage.getItem('custom_session');
      const storedProfile = localStorage.getItem('custom_profile');
      
      if (!storedSession || !storedProfile) {
        console.log('📱 ATENDENTE: No stored session, redirecting...');
        window.location.replace('/acesso');
        return;
      }

      try {
        const profileData = JSON.parse(storedProfile);
        const allowedRoles = ['atendente', 'admin', 'super_admin'];
        
        if (!allowedRoles.includes(profileData.role)) {
          console.log('📱 ATENDENTE: Role not allowed:', profileData.role);
          window.location.replace('/acesso');
          return;
        }
        
        console.log('📱 ATENDENTE: Mobile access granted for:', profileData.role);
      } catch (error) {
        console.error('📱 ATENDENTE: Error parsing stored data:', error);
        window.location.replace('/acesso');
        return;
      }
    }
  }, [isLoading]);

  // Fallback check para desktop/outros casos
  useEffect(() => {
    if (!isLoading && (!profile || !hasRole(['atendente', 'admin', 'super_admin']))) {
      window.location.replace('/acesso');
      return;
    }
  }, [profile, hasRole, isLoading]);

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

  if (!profile || !hasRole(['atendente', 'admin', 'super_admin'])) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">Painel do Atendente</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.full_name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <ComplaintsList />
      </div>
    </div>
  );
}