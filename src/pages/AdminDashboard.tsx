
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { ComplaintsList } from '@/components/admin/ComplaintsList';
import { Users, FileText } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout, hasRole, isLoading } = useAuth();

  useEffect(() => {
    console.log('Admin - User:', user);
    console.log('Admin - HasRole admin/super_admin:', hasRole(['admin', 'super_admin']));
    console.log('Admin - IsLoading:', isLoading);
    
    // Só redirecionar se não estiver carregando e realmente não tiver permissão
    if (!isLoading && (!user || !hasRole(['admin', 'super_admin']))) {
      console.log('Redirecionando para login - usuário sem permissão');
      window.location.href = '/acesso';
    }
  }, [user, hasRole, isLoading]);

  // Mostrar loading enquanto verifica autenticação
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

  if (!user || !hasRole(['admin', 'super_admin'])) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} />
      
      {/* User Info Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Administrador
              </h1>
              <p className="text-sm text-gray-600">
                Bem-vindo, {user.full_name}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={logout}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="complaints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-fit">
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Denúncias
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Atendentes
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
                <ComplaintsList userRole="admin" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Atendentes</CardTitle>
                <CardDescription>
                  Cadastre e desative usuários atendentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement userRole="admin" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
