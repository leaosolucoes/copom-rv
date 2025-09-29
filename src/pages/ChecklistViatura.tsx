import { useNavigate } from "react-router-dom";
import { ChecklistViatura as ChecklistViaturaComponent } from "@/components/admin/ChecklistViatura";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export default function ChecklistViatura() {
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');

  const getBackRoute = () => {
    switch (profile?.role) {
      case 'fiscal':
        return '/fiscal';
      case 'motorista':
        return '/motoristas';
      case 'atendente':
        return '/atendente';
      case 'admin':
        return '/admin';
      case 'super_admin':
        return '/super-admin';
      default:
        return '/';
    }
  };

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
      
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(getBackRoute())}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-primary">
            Checklist de Viatura
          </h1>
        </div>

        <ChecklistViaturaComponent />
      </div>
    </div>
  );
}