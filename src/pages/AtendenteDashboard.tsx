import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ComplaintsListLazy } from "@/components/admin/ComplaintsListLazy";
import { CNPJLookup } from "@/components/cnpj/CNPJLookup";
import { CPFLookup } from "@/components/cpf/CPFLookup";
import { AttendantComplaintForm } from "@/components/complaints/AttendantComplaintForm";
import { LogOut, FileText, Search, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AtendenteDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      
      <div className="container mx-auto p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-primary">Painel do Atendente</h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Bem-vindo, {profile?.full_name || 'Carregando...'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="w-full sm:w-auto">
                  <Phone className="h-4 w-4 mr-2" />
                  Registrar Ligação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Denúncia por Ligação</DialogTitle>
                </DialogHeader>
                <AttendantComplaintForm onSuccess={() => setIsModalOpen(false)} />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={signOut} size="sm" className="w-full sm:w-auto">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="complaints" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:w-fit">
            <TabsTrigger value="complaints" className="flex items-center gap-2 text-xs md:text-sm">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Denúncias</span>
              <span className="sm:hidden">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="consultas" className="flex items-center gap-2 text-xs md:text-sm">
              <Search className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Consultas</span>
              <span className="sm:hidden">Busca</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="complaints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acompanhar Denúncias</CardTitle>
                <CardDescription>
                  Visualize todas as denúncias e o fluxo de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComplaintsListLazy />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consultas" className="space-y-6">
            <div className="space-y-6">
              <CNPJLookup />
              <CPFLookup />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}