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
import { Plus, Edit, Trash2, Car, Power, PowerOff, CheckCircle, AlertTriangle, XCircle, Fuel, Droplets, Settings } from 'lucide-react';
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

interface ChecklistViatura {
  id: string;
  data_checklist: string;
  horario_checklist: string;
  nome_guerra: string;
  km_inicial: number;
  combustivel_nivel: string;
  oleo_nivel: string;
  limpeza_ok: boolean;
  observacoes_alteracoes: string | null;
  status_aprovacao: string | null;
  created_at: string;
}

interface ChecklistDetalhado extends ChecklistViatura {
  checklist_pneus?: {
    dianteiro_direito: string;
    dianteiro_esquerdo: string;
    traseiro_direito: string;
    traseiro_esquerdo: string;
    estepe: string;
  }[];
  checklist_equipamentos?: {
    equipamento_nome: string;
    status: string;
  }[];
}

export const ViaturasManagement = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistDetailDialogOpen, setChecklistDetailDialogOpen] = useState(false);
  const [viatureToDelete, setViatureToDelete] = useState<Viatura | null>(null);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [selectedChecklistDetail, setSelectedChecklistDetail] = useState<ChecklistDetalhado | null>(null);
  const [checklists, setChecklists] = useState<ChecklistViatura[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [loadingChecklistDetail, setLoadingChecklistDetail] = useState(false);
  const [editingViatura, setEditingViatura] = useState<Viatura | null>(null);
  const [formData, setFormData] = useState({
    prefixo: '',
    placa: '',
    modelo: '',
    km_atual: 0,
    ativa: true
  });
  const { toast } = useToast();

  const fetchChecklists = async (viaturaId: string) => {
    setLoadingChecklists(true);
    try {
      const { data, error } = await supabase
        .from('checklist_viaturas')
        .select('*')
        .eq('viatura_id', viaturaId)
        .order('data_checklist', { ascending: false });

      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de checklists",
        variant: "destructive"
      });
    } finally {
      setLoadingChecklists(false);
    }
  };

  const fetchChecklistDetails = async (checklistId: string) => {
    setLoadingChecklistDetail(true);
    try {
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist_viaturas')
        .select('*')
        .eq('id', checklistId)
        .single();

      if (checklistError) throw checklistError;

      const { data: pneusData, error: pneusError } = await supabase
        .from('checklist_pneus')
        .select('*')
        .eq('checklist_id', checklistId);

      if (pneusError) throw pneusError;

      const { data: equipamentosData, error: equipamentosError } = await supabase
        .from('checklist_equipamentos')
        .select('*')
        .eq('checklist_id', checklistId);

      if (equipamentosError) throw equipamentosError;

      const detailedChecklist: ChecklistDetalhado = {
        ...checklistData,
        checklist_pneus: pneusData,
        checklist_equipamentos: equipamentosData
      };

      setSelectedChecklistDetail(detailedChecklist);
      setChecklistDetailDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do checklist",
        variant: "destructive"
      });
    } finally {
      setLoadingChecklistDetail(false);
    }
  };

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

  const handleViatureClick = (viatura: Viatura) => {
    setSelectedViatura(viatura);
    setChecklistDialogOpen(true);
    fetchChecklists(viatura.id);
  };

  const getStatusBadge = (checklist: ChecklistViatura) => {
    // Usar o status_aprovacao salvo no banco de dados
    if (checklist.status_aprovacao === 'aprovado') {
      return (
        <Badge 
          variant="default" 
          className="bg-green-500 cursor-pointer hover:bg-green-600"
          onClick={(e) => {
            e.stopPropagation();
            fetchChecklistDetails(checklist.id);
          }}
        >
          Aprovado pelo Fiscal
        </Badge>
      );
    } else if (checklist.status_aprovacao === 'reprovado') {
      return (
        <Badge 
          variant="destructive"
          className="cursor-pointer hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            fetchChecklistDetails(checklist.id);
          }}
        >
          Reprovado pelo Fiscal
        </Badge>
      );
    } else {
      return (
        <Badge 
          variant="outline"
          className="cursor-pointer hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            fetchChecklistDetails(checklist.id);
          }}
        >
          Pendente
        </Badge>
      );
    }
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
                    <TableRow 
                      key={viatura.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViatureClick(viatura)}
                    >
                      <TableCell className="font-medium">{viatura.prefixo}</TableCell>
                      <TableCell>{viatura.placa}</TableCell>
                      <TableCell>{viatura.modelo}</TableCell>
                      <TableCell>{viatura.km_atual.toLocaleString()} km</TableCell>
                      <TableCell>
                        <Badge variant={viatura.ativa ? "default" : "secondary"}>
                          {viatura.ativa ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Histórico de Checklists - {selectedViatura?.prefixo} ({selectedViatura?.placa})
            </DialogTitle>
          </DialogHeader>
          
          {loadingChecklists ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : checklists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum checklist realizado para esta viatura</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Fiscal</TableHead>
                    <TableHead>KM Inicial</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Óleo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklists.map((checklist) => (
                    <TableRow key={checklist.id}>
                      <TableCell>
                        {new Date(checklist.data_checklist).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{checklist.horario_checklist}</TableCell>
                      <TableCell className="font-medium">{checklist.nome_guerra}</TableCell>
                      <TableCell>{checklist.km_inicial.toLocaleString()} km</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {checklist.combustivel_nivel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {checklist.oleo_nivel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(checklist)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {checklists.some(c => c.observacoes_alteracoes) && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Observações dos Fiscais:</h4>
                  {checklists
                    .filter(c => c.observacoes_alteracoes)
                    .map((checklist) => (
                      <div key={checklist.id} className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">{checklist.nome_guerra}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(checklist.data_checklist).toLocaleDateString('pt-BR')} às {checklist.horario_checklist}
                          </span>
                        </div>
                        <p className="text-sm">{checklist.observacoes_alteracoes}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Checklist */}
      <Dialog open={checklistDetailDialogOpen} onOpenChange={setChecklistDetailDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Detalhes do Checklist - {selectedChecklistDetail?.data_checklist ? 
                new Date(selectedChecklistDetail.data_checklist).toLocaleDateString('pt-BR') : ''
              }
            </DialogTitle>
          </DialogHeader>
          
          {loadingChecklistDetail ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedChecklistDetail ? (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                    <p className="font-medium">{new Date(selectedChecklistDetail.data_checklist).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Horário</Label>
                    <p className="font-medium">{selectedChecklistDetail.horario_checklist}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fiscal</Label>
                    <p className="font-medium">{selectedChecklistDetail.nome_guerra}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">KM Inicial</Label>
                    <p className="font-medium">{selectedChecklistDetail.km_inicial.toLocaleString()} km</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {selectedChecklistDetail.status_aprovacao === 'aprovado' ? (
                        <Badge variant="default" className="bg-green-500">Aprovado</Badge>
                      ) : selectedChecklistDetail.status_aprovacao === 'reprovado' ? (
                        <Badge variant="destructive">Reprovado</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Combustível e Óleo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Fuel className="h-5 w-5" />
                    Combustível e Óleo
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nível de Combustível</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Fuel className="h-4 w-4" />
                      <Badge variant="outline" className="capitalize">{selectedChecklistDetail.combustivel_nivel}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nível de Óleo</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Droplets className="h-4 w-4" />
                      <Badge variant="outline" className="capitalize">{selectedChecklistDetail.oleo_nivel}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avaliação dos Pneus */}
              {selectedChecklistDetail.checklist_pneus && selectedChecklistDetail.checklist_pneus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Avaliação dos Pneus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedChecklistDetail.checklist_pneus.map((pneu, index) => (
                      <div key={index} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Dianteiro Direito</Label>
                          <Badge variant={pneu.dianteiro_direito === 'otimo' ? 'default' : pneu.dianteiro_direito === 'bom' ? 'secondary' : 'destructive'}>
                            {pneu.dianteiro_direito}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Dianteiro Esquerdo</Label>
                          <Badge variant={pneu.dianteiro_esquerdo === 'otimo' ? 'default' : pneu.dianteiro_esquerdo === 'bom' ? 'secondary' : 'destructive'}>
                            {pneu.dianteiro_esquerdo}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Traseiro Direito</Label>
                          <Badge variant={pneu.traseiro_direito === 'otimo' ? 'default' : pneu.traseiro_direito === 'bom' ? 'secondary' : 'destructive'}>
                            {pneu.traseiro_direito}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Traseiro Esquerdo</Label>
                          <Badge variant={pneu.traseiro_esquerdo === 'otimo' ? 'default' : pneu.traseiro_esquerdo === 'bom' ? 'secondary' : 'destructive'}>
                            {pneu.traseiro_esquerdo}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Estepe</Label>
                          <Badge variant={pneu.estepe === 'otimo' ? 'default' : pneu.estepe === 'bom' ? 'secondary' : 'destructive'}>
                            {pneu.estepe}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Equipamentos */}
              {selectedChecklistDetail.checklist_equipamentos && selectedChecklistDetail.checklist_equipamentos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Status dos Equipamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedChecklistDetail.checklist_equipamentos.map((equipamento, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {equipamento.status === 'ok' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : equipamento.status === 'defeituoso' ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">{equipamento.equipamento_nome}</span>
                          </div>
                          <Badge variant={
                            equipamento.status === 'ok' ? 'default' : 
                            equipamento.status === 'defeituoso' ? 'secondary' : 'destructive'
                          }>
                            {equipamento.status === 'ok' ? 'OK' : 
                             equipamento.status === 'defeituoso' ? 'Defeituoso' : 'Não tem'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Limpeza e Observações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Limpeza e Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status da Limpeza</Label>
                    <div className="mt-1">
                      <Badge variant={selectedChecklistDetail.limpeza_ok ? 'default' : 'destructive'}>
                        {selectedChecklistDetail.limpeza_ok ? 'Limpeza OK' : 'Limpeza Pendente'}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedChecklistDetail.observacoes_alteracoes && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Observações e Alterações</Label>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{selectedChecklistDetail.observacoes_alteracoes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};