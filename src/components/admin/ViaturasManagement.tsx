import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Car, Power, PowerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Viatura {
  id: string;
  prefixo: string;
  placa: string;
  modelo: string;
  km_atual: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export const ViaturasManagement = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viatureToDelete, setViatureToDelete] = useState<Viatura | null>(null);
  const [editingViatura, setEditingViatura] = useState<Viatura | null>(null);
  const [formData, setFormData] = useState({
    prefixo: '',
    placa: '',
    modelo: '',
    km_atual: 0,
    ativa: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchViaturas();
  }, []);

  const fetchViaturas = async () => {
    try {
      const { data, error } = await supabase
        .from('viaturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setViaturas(data || []);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingViatura) {
        const { error } = await supabase
          .from('viaturas')
          .update(formData)
          .eq('id', editingViatura.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Viatura atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('viaturas')
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Viatura cadastrada com sucesso"
        });
      }

      setDialogOpen(false);
      setEditingViatura(null);
      setFormData({
        prefixo: '',
        placa: '',
        modelo: '',
        km_atual: 0,
        ativa: true
      });
      fetchViaturas();
    } catch (error: any) {
      console.error('Erro ao salvar viatura:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar viatura",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (viatura: Viatura) => {
    setEditingViatura(viatura);
    setFormData({
      prefixo: viatura.prefixo,
      placa: viatura.placa,
      modelo: viatura.modelo,
      km_atual: viatura.km_atual,
      ativa: viatura.ativa
    });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('viaturas')
        .update({ ativa: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Viatura ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`
      });
      fetchViaturas();
    } catch (error: any) {
      console.error('Erro ao alterar status da viatura:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status da viatura",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (viatura: Viatura) => {
    setViatureToDelete(viatura);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!viatureToDelete) return;

    try {
      const { error } = await supabase
        .from('viaturas')
        .delete()
        .eq('id', viatureToDelete.id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Viatura excluída com sucesso"
      });
      fetchViaturas();
    } catch (error: any) {
      console.error('Erro ao excluir viatura:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir viatura",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setViatureToDelete(null);
    }
  };

  const openNewDialog = () => {
    setEditingViatura(null);
    setFormData({
      prefixo: '',
      placa: '',
      modelo: '',
      km_atual: 0,
      ativa: true
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Gestão de Viaturas</h2>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Viatura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingViatura ? 'Editar Viatura' : 'Nova Viatura'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prefixo">Prefixo</Label>
                <Input
                  id="prefixo"
                  value={formData.prefixo}
                  onChange={(e) => setFormData({ ...formData, prefixo: e.target.value })}
                  placeholder="Ex: VTR 8.14504"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                  placeholder="Ex: SDJ2A32"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ex: Toyota Hilux 2023"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="km_atual">KM Atual</Label>
                <Input
                  id="km_atual"
                  type="number"
                  value={formData.km_atual}
                  onChange={(e) => setFormData({ ...formData, km_atual: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativa"
                  checked={formData.ativa}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                />
                <Label htmlFor="ativa">Viatura Ativa</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingViatura ? 'Atualizar' : 'Cadastrar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Viaturas</CardTitle>
        </CardHeader>
        <CardContent>
          {viaturas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma viatura cadastrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>KM Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viaturas.map((viatura) => (
                    <TableRow key={viatura.id}>
                      <TableCell className="font-medium">{viatura.prefixo}</TableCell>
                      <TableCell>{viatura.placa}</TableCell>
                      <TableCell>{viatura.modelo}</TableCell>
                      <TableCell>{viatura.km_atual.toLocaleString()} km</TableCell>
                      <TableCell>
                        <Badge variant={viatura.ativa ? "default" : "secondary"}>
                          {viatura.ativa ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant={viatura.ativa ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleStatus(viatura.id, viatura.ativa)}
                            title={viatura.ativa ? "Desativar viatura" : "Ativar viatura"}
                          >
                            {viatura.ativa ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(viatura)}
                            title="Editar viatura"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(viatura)}
                            title="Excluir viatura"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a viatura <strong>{viatureToDelete?.prefixo}</strong> - <strong>{viatureToDelete?.placa}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};