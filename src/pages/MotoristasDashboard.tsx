import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ChecklistViaturaCard } from "@/components/fiscal/ChecklistViaturaCard";
import { EscalaAtivaCard } from "@/components/motorista/EscalaAtivaCard";
import { useEscalas } from "@/hooks/useEscalas";
import { LogOut, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function MotoristasDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const { escalaAtiva, loading: escalasLoading, refetch: refetchEscalas } = useEscalas();

  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/acesso');
      return;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Car className="h-6 w-6" />
              Painel do Motorista
            </h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.full_name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Checklist de Viatura
            </h2>
            <p className="text-muted-foreground mb-4">
              Realize a inspeção completa da viatura antes de iniciar seu serviço.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2">
              <ChecklistViaturaCard />
              
              {!escalasLoading && escalaAtiva && (
                <EscalaAtivaCard 
                  escala={escalaAtiva} 
                  onEscalaUpdated={refetchEscalas}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}