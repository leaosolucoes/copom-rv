import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { CNPJLookup } from "@/components/cnpj/CNPJLookup";
import { CPFLookup } from "@/components/cpf/CPFLookup";
import { CEPLookup } from "@/components/cep/CEPLookup";
import { FiscalAudienciasDashboard } from "@/components/audiencias/FiscalAudienciasDashboard";
import { LogOut, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function FiscalDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');

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
              <FileSearch className="h-6 w-6" />
              Painel Fiscal de Posturas
            </h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.full_name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="grid gap-6">
          <FiscalAudienciasDashboard />
          
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Ferramentas do Fiscal
            </h2>
            <p className="text-muted-foreground mb-4">
              Utilize as ferramentas abaixo para consultas e verificações necessárias para fiscalização de posturas municipais.
            </p>
          </div>

          <CNPJLookup />
          <CPFLookup />
          <CEPLookup />
        </div>
      </div>
    </div>
  );
}