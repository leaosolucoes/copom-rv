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

  useEffect(() => {
    console.log('📱 ATENDENTE DASHBOARD: isLoading:', isLoading, 'profile:', !!profile, 'hasRole:', hasRole(['atendente', 'admin', 'super_admin']));
    
    if (profile) {
      console.log('📱 ATENDENTE: Profile data:', { 
        full_name: profile.full_name, 
        role: profile.role,
        is_active: profile.is_active 
      });
    }
    
    // Mobile immediate redirect if not authorized
    if (!isLoading) {
      if (!profile) {
        console.log('📱 ATENDENTE: No profile, redirecting to /acesso');
        window.location.href = '/acesso';
        return;
      }
      
      // Check role specifically
      const allowedRoles = ['atendente', 'admin', 'super_admin'];
      const roleCheck = hasRole(allowedRoles);
      
      console.log('📱 ATENDENTE: Role check result:', roleCheck, 'for roles:', allowedRoles);
      
      if (!roleCheck) {
        console.log('📱 ATENDENTE: Role not allowed, redirecting to /acesso');
        window.location.href = '/acesso';
        return;
      }
      
      console.log('📱 ATENDENTE: All checks passed, showing dashboard');
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