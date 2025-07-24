import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ComplaintsListLazy } from "@/components/admin/ComplaintsListLazy";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AtendenteDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const isMobile = useIsMobile();

  useEffect(() => {
    // Mobile-optimized authentication check
    const checkAuth = () => {
      if (!isLoading) {
        if (!profile) {
          console.log('📱 ATENDENTE: No profile, redirecting to /acesso');
          try {
            navigate('/acesso');
          } catch (error) {
            console.error('📱 ATENDENTE: Navigate failed, using window.location');
            window.location.href = '/acesso';
          }
        } else {
          console.log('📱 ATENDENTE: Profile confirmed:', profile.full_name);
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

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      
      <div className="container mx-auto p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-primary">Painel do Atendente</h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Bem-vindo, {profile?.full_name || 'Carregando...'}
            </p>
          </div>
          <Button variant="outline" onClick={signOut} size="sm" className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <ComplaintsListLazy />
      </div>
    </div>
  );
}