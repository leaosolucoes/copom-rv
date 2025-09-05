import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Car, User, Clock, Gauge, Fuel, Droplets, CheckCircle, XCircle, AlertCircle, Wrench } from 'lucide-react';

interface ChecklistDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistId: string | null;
}

interface ChecklistDetail {
  id: string;
  data_checklist: string;
  horario_checklist: string;
  nome_guerra: string;
  viatura_id: string;
  fiscal_id: string;
  km_inicial: number;
  combustivel_nivel: string;
  oleo_nivel: string;
  limpeza_ok: boolean;
  data_proxima_troca_oleo: string | null;
  km_proxima_troca_oleo: number | null;
  status_aprovacao: string | null;
  observacoes_alteracoes: string | null;
  created_at: string;
  updated_at: string;
  viaturas?: {
    prefixo: string;
    modelo: string;
    placa: string;
    km_atual: number;
  };
  users?: {
    full_name: string;
    email: string;
  };
}

interface ChecklistEquipamento {
  id: string;
  equipamento_nome: string;
  status: string;
}

interface ChecklistPneus {
  dianteiro_esquerdo: string;
  dianteiro_direito: string;
  traseiro_esquerdo: string;
  traseiro_direito: string;
  estepe: string;
}

export const ChecklistDetailModal = ({ open, onOpenChange, checklistId }: ChecklistDetailModalProps) => {
  const [checklist, setChecklist] = useState<ChecklistDetail | null>(null);
  const [equipamentos, setEquipamentos] = useState<ChecklistEquipamento[]>([]);
  const [pneus, setPneus] = useState<ChecklistPneus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && checklistId) {
      fetchChecklistDetail();
    }
  }, [open, checklistId]);

  const fetchChecklistDetail = async () => {
    if (!checklistId) return;
    
    setLoading(true);
    try {
      // Buscar dados principais do checklist
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist_viaturas')
        .select(`
          *,
          viaturas (
            prefixo,
            modelo,
            placa,
            km_atual
          )
        `)
        .eq('id', checklistId)
        .single();

      if (checklistError) throw checklistError;

      // Buscar dados do fiscal separadamente
      let fiscalData = null;
      if (checklistData.fiscal_id) {
        const { data: fiscal } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', checklistData.fiscal_id)
          .single();
        fiscalData = fiscal;
      }

      // Buscar equipamentos do checklist
      const { data: equipamentosData, error: equipamentosError } = await supabase
        .from('checklist_equipamentos')
        .select('*')
        .eq('checklist_id', checklistId);

      if (equipamentosError) throw equipamentosError;

      // Buscar dados dos pneus
      const { data: pneusData, error: pneusError } = await supabase
        .from('checklist_pneus')
        .select('*')
        .eq('checklist_id', checklistId)
        .single();

      if (pneusError && pneusError.code !== 'PGRST116') throw pneusError;

      setChecklist({
        ...checklistData,
        users: fiscalData
      });
      setEquipamentos(equipamentosData || []);
      setPneus(pneusData);
    } catch (error) {
      console.error('Erro ao carregar detalhes do checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do checklist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'reprovado':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'aprovado':
        return 'default';
      case 'reprovado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getEquipamentoIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'com_problema':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'nao_tem':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPneuIcon = (status: string) => {
    switch (status) {
      case 'bom':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'regular':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'ruim':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!checklist) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Checklist
          </DialogTitle>
          <DialogDescription>
            Checklist realizado em {new Date(checklist.data_checklist).toLocaleDateString('pt-BR')} às {checklist.horario_checklist}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Viatura</h4>
                  <p className="font-medium">{checklist.viaturas?.prefixo} - {checklist.viaturas?.modelo}</p>
                  <p className="text-sm text-muted-foreground">Placa: {checklist.viaturas?.placa}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Fiscal Responsável</h4>
                  <p className="font-medium">{checklist.nome_guerra}</p>
                  <p className="text-sm text-muted-foreground">{checklist.users?.full_name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(checklist.status_aprovacao || 'pendente')}
                    <Badge variant={getStatusBadgeVariant(checklist.status_aprovacao)}>
                      {checklist.status_aprovacao === 'aprovado' ? 'Aprovado' : 
                       checklist.status_aprovacao === 'reprovado' ? 'Reprovado' : 
                       'Pendente'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Quilometragem</h4>
                  <p className="font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    {checklist.km_inicial.toLocaleString()} km
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Níveis de Combustível e Óleo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Níveis de Fluidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Combustível</h4>
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Fuel className="h-4 w-4" />
                    {checklist.combustivel_nivel}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Óleo</h4>
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    {checklist.oleo_nivel}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Limpeza</h4>
                  <Badge variant={checklist.limpeza_ok ? "default" : "destructive"} className="flex items-center gap-2">
                    {checklist.limpeza_ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {checklist.limpeza_ok ? 'OK' : 'Não OK'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos */}
          {equipamentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {equipamentos.map((equipamento) => (
                    <div key={equipamento.id} className="flex items-center gap-2 p-2 border rounded">
                      {getEquipamentoIcon(equipamento.status)}
                      <div>
                        <p className="text-sm font-medium">{equipamento.equipamento_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {equipamento.status === 'ok' ? 'OK' : 
                           equipamento.status === 'com_problema' ? 'Com Problema' : 
                           'Não Tem'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pneus */}
          {pneus && (
            <Card>
              <CardHeader>
                <CardTitle>Estado dos Pneus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    {getPneuIcon(pneus.dianteiro_esquerdo)}
                    <div>
                      <p className="text-sm font-medium">Dianteiro Esquerdo</p>
                      <p className="text-xs text-muted-foreground">{pneus.dianteiro_esquerdo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPneuIcon(pneus.dianteiro_direito)}
                    <div>
                      <p className="text-sm font-medium">Dianteiro Direito</p>
                      <p className="text-xs text-muted-foreground">{pneus.dianteiro_direito}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPneuIcon(pneus.traseiro_esquerdo)}
                    <div>
                      <p className="text-sm font-medium">Traseiro Esquerdo</p>
                      <p className="text-xs text-muted-foreground">{pneus.traseiro_esquerdo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPneuIcon(pneus.traseiro_direito)}
                    <div>
                      <p className="text-sm font-medium">Traseiro Direito</p>
                      <p className="text-xs text-muted-foreground">{pneus.traseiro_direito}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPneuIcon(pneus.estepe)}
                    <div>
                      <p className="text-sm font-medium">Estepe</p>
                      <p className="text-xs text-muted-foreground">{pneus.estepe}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manutenção de Óleo */}
          {(checklist.data_proxima_troca_oleo || checklist.km_proxima_troca_oleo) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Manutenção de Óleo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.data_proxima_troca_oleo && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Próxima Troca (Data)</h4>
                      <p className="font-medium">
                        {new Date(checklist.data_proxima_troca_oleo).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {checklist.km_proxima_troca_oleo && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Próxima Troca (KM)</h4>
                      <p className="font-medium">
                        {checklist.km_proxima_troca_oleo.toLocaleString()} km
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {checklist.observacoes_alteracoes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{checklist.observacoes_alteracoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-muted-foreground">Criado em</h4>
                  <p>{new Date(checklist.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground">Atualizado em</h4>
                  <p>{new Date(checklist.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};