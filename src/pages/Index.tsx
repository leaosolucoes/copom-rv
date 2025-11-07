import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { PublicComplaintForm } from '@/components/complaints/PublicComplaintForm';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se existe uma sessão ativa e redirecionar para o dashboard apropriado
    const checkSession = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: users } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (users?.role === 'super_admin') {
          navigate('/super-admin');
        } else if (users?.role === 'admin') {
          navigate('/admin');
        } else if (users?.role === 'atendente') {
          navigate('/atendente');
        } else if (users?.role === 'fiscal') {
          navigate('/fiscal');
        }
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-card-foreground mb-6">
              Registrar Denúncia
            </h2>
            <PublicComplaintForm />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
