import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChecklistDetailModal } from './ChecklistDetailModal';

interface ChecklistHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChecklistItem {
  id: string;
  data_checklist: string;
  horario_checklist: string;
  nome_guerra: string;
  viatura_id: string;
  km_inicial: number;
  combustivel_nivel: string;
  oleo_nivel: string;
  status_aprovacao: string | null;
  observacoes_alteracoes: string;
  viaturas?: {
    prefixo: string;
    modelo: string;
    placa: string;
  };
}

export const ChecklistHistoryModal = ({ open, onOpenChange }: ChecklistHistoryModalProps) => {
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchChecklists();
    }
  }, [open]);

  const fetchChecklists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('checklist_viaturas')
        .select(`
          *,
          viaturas (
            prefixo,
            modelo,
            placa
          )
        `)
        .order('data_checklist', { ascending: false })
        .order('horario_checklist', { ascending: false })
        .limit(50);

      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de checklists:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de checklists",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const getCombustivelColor = (nivel: string) => {
    switch (nivel) {
      case 'reserva':
        return 'text-red-600';
      case '1/4':
        return 'text-orange-600';
      case '1/2':
        return 'text-yellow-600';
      case '3/4':
        return 'text-blue-600';
      case 'cheio':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getOleoColor = (nivel: string) => {
    switch (nivel) {
      case 'baixo':
        return 'text-red-600';
      case 'normal':
        return 'text-green-600';
      case 'acima':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Checklists
          </DialogTitle>
          <DialogDescription>
            Últimos 50 checklists realizados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Viatura</TableHead>
                    <TableHead>Fiscal</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Óleo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklists.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Nenhum checklist encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    checklists.map((checklist) => (
                      <TableRow key={checklist.id}>
                        <TableCell>
                          {new Date(checklist.data_checklist).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{checklist.horario_checklist}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {checklist.viaturas?.prefixo || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {checklist.viaturas?.modelo}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {checklist.nome_guerra}
                        </TableCell>
                        <TableCell>
                          {checklist.km_inicial.toLocaleString()} km
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getCombustivelColor(checklist.combustivel_nivel)}>
                            {checklist.combustivel_nivel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getOleoColor(checklist.oleo_nivel)}>
                            {checklist.oleo_nivel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(checklist.status_aprovacao)}>
                            {checklist.status_aprovacao === 'aprovado' ? 'Aprovado' : 
                             checklist.status_aprovacao === 'reprovado' ? 'Reprovado' : 
                             'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedChecklistId(checklist.id);
                              setShowDetailModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
      
      <ChecklistDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        checklistId={selectedChecklistId}
      />
    </Dialog>
  );
};