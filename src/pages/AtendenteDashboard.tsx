import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ComplaintsList } from "@/components/admin/ComplaintsList";
import { LogOut } from "lucide-react";

export default function AtendenteDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/acesso');
      return;
    }
  }, [profile, navigate, isLoading]);

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
      <Header showLoginButton={false} />
      
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