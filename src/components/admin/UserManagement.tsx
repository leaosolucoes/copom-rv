
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'atendente';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface UserManagementProps {
  userRole?: 'admin' | 'super_admin';
}

export const UserManagement = ({ userRole = 'super_admin' }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'atendente' as 'admin' | 'atendente',
    is_active: true
  });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use the secure function to get users
      const { data, error } = await supabase.rpc('get_users_secure');

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; users?: any[] };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      const allUsers = result.users || [];
      
      // Filter users based on role permissions
      const filteredUsers = userRole === 'admin' 
        ? allUsers.filter((user: any) => user.role === 'atendente')
        : allUsers;
        
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user using secure function
        const { data, error } = await supabase.rpc('update_user_secure', {
          p_user_id: editingUser.id,
          p_email: formData.email,
          p_full_name: formData.full_name,
          p_password: formData.password || null,
          p_role: formData.role,
          p_is_active: formData.is_active
        });

        if (error) throw error;
        
        const result = data as { success: boolean; error?: string };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update user');
        }

        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso!",
        });
      } else {
        // Create new user using secure function
        const { data, error } = await supabase.rpc('create_user_secure', {
          p_email: formData.email,
          p_full_name: formData.full_name,
          p_password: formData.password,
          p_role: formData.role,
          p_is_active: formData.is_active
        });

        if (error) throw error;
        
        const result = data as { success: boolean; error?: string };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create user');
        }

        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso!",
        });
      }

      setDialogOpen(false);
      setEditingUser(null);
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'atendente',
        is_active: true
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar usuário",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      role: user.role as 'admin' | 'atendente',
      is_active: user.is_active
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      // Find the user to get their current data
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const { data, error } = await supabase.rpc('update_user_secure', {
        p_user_id: userId,
        p_email: user.email,
        p_full_name: user.full_name,
        p_role: user.role,
        p_is_active: !isActive
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user status');
      }

      toast({
        title: "Sucesso",
        description: `Usuário ${!isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });
      
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do usuário",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      super_admin: 'bg-red-500',
      admin: 'bg-blue-500',
      atendente: 'bg-green-500'
    };
    
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      atendente: 'Atendente'
    };

    return (
      <Badge className={`${colors[role as keyof typeof colors]} text-white`}>
        {labels[role as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return <div>Carregando usuários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {userRole === 'admin' ? 'Atendentes' : 'Usuários'}
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingUser(null);
              setFormData({
                email: '',
                full_name: '',
                password: '',
                role: 'atendente',
                is_active: true
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">
                  {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required={!editingUser}
                />
              </div>
              {userRole === 'super_admin' && (
                <div>
                  <Label htmlFor="role">Perfil</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'admin' | 'atendente') => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="atendente">Atendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Usuário Ativo</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString('pt-BR')
                      : 'Nunca'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? "destructive" : "default"}
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
