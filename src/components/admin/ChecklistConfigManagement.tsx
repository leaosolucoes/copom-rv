import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChecklistConfigItem {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

const categorias = [
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'inspecao_visual', label: 'Inspeção Visual' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'manutencao', label: 'Manutenção' }
];

export const ChecklistConfigManagement = () => {
  const [items, setItems] = useState<ChecklistConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistConfigItem | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistConfigItem | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'equipamento',
    descricao: '',
    obrigatorio: true,
    ativo: true,
    ordem: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_config_items')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar itens do checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do checklist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('checklist_config_items')
          .update({
            nome: formData.nome,
            categoria: formData.categoria,
            descricao: formData.descricao || null,
            obrigatorio: formData.obrigatorio,
            ativo: formData.ativo,
            ordem: formData.ordem
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Item atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('checklist_config_items')
          .insert([{
            nome: formData.nome,
            categoria: formData.categoria,
            descricao: formData.descricao || null,
            obrigatorio: formData.obrigatorio,
            ativo: formData.ativo,
            ordem: formData.ordem
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Item criado com sucesso"
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      console.error('Erro ao salvar item:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('checklist_config_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item removido com sucesso"
      });

      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchItems();
    } catch (error: any) {
      console.error('Erro ao deletar item:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ChecklistConfigItem) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      categoria: item.categoria,
      descricao: item.descricao || '',
      obrigatorio: item.obrigatorio,
      ativo: item.ativo,
      ordem: item.ordem
    });
    setDialogOpen(true);
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) return;

    const currentIndex = items.findIndex(item => item.id === itemId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= items.length) return;

    const otherItem = items[newIndex];

    try {
      // Trocar as ordens
      await supabase
        .from('checklist_config_items')
        .update({ ordem: otherItem.ordem })
        .eq('id', currentItem.id);

      await supabase
        .from('checklist_config_items')
        .update({ ordem: currentItem.ordem })
        .eq('id', otherItem.id);

      fetchItems();
    } catch (error) {
      console.error('Erro ao reordenar item:', error);
      toast({
        title: "Erro",
        description: "Erro ao reordenar item",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: 'equipamento',
      descricao: '',
      obrigatorio: true,
      ativo: true,
      ordem: items.length + 1
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({ ...prev, ordem: items.length + 1 }));
    setDialogOpen(true);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração do Checklist
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os itens que aparecem no checklist das viaturas
            </p>
          </div>
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum item configurado</p>
            <p className="text-sm">Clique em "Novo Item" para adicionar itens ao checklist</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono">{item.ordem}</span>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleMoveItem(item.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleMoveItem(item.id, 'down')}
                          disabled={index === items.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.nome}</div>
                      {item.descricao && (
                        <div className="text-sm text-muted-foreground">{item.descricao}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {categorias.find(c => c.value === item.categoria)?.label || item.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.obrigatorio ? "default" : "secondary"}>
                      {item.obrigatorio ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? "default" : "secondary"}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Dialog de Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Item' : 'Novo Item do Checklist'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Item *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Extintor de incêndio"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.value} value={categoria.value}>
                        {categoria.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional do item..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem de Exibição</Label>
                <Input
                  id="ordem"
                  type="number"
                  min="1"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="obrigatorio"
                  checked={formData.obrigatorio}
                  onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
                />
                <Label htmlFor="obrigatorio">Item obrigatório</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo">Item ativo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : editingItem ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o item "{itemToDelete?.nome}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};