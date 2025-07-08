import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Download, MessageSquare, Calendar, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = 'nova' | 'cadastrada' | 'finalizada' | 'a_verificar';

interface Complaint {
  id: string;
  // Dados do reclamante
  complainant_name: string;
  complainant_phone: string;
  complainant_type: string;
  complainant_address: string;
  complainant_number?: string;
  complainant_block?: string;
  complainant_lot?: string;
  complainant_neighborhood: string;
  
  // Endereço da ocorrência
  occurrence_type: string;
  occurrence_address: string;
  occurrence_number?: string;
  occurrence_block?: string;
  occurrence_lot?: string;
  occurrence_neighborhood: string;
  occurrence_reference?: string;
  
  // Dados da reclamação
  narrative: string;
  occurrence_date?: string;
  occurrence_time?: string;
  classification: string;
  assigned_to?: string;
  
  // Controle interno
  status: ComplaintStatus;
  system_identifier?: string;
  processed_at?: string;
  attendant_id?: string;
  whatsapp_sent?: boolean;
  created_at: string;
}

interface ComplaintsListProps {
  userRole: 'super_admin' | 'admin' | 'atendente';
}

export const ComplaintsList = ({ userRole }: ComplaintsListProps) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [showRaiModal, setShowRaiModal] = useState(false);
  const [raiData, setRaiData] = useState({ rai: '', classification: '' });
  const { toast } = useToast();
  const { profile } = useSupabaseAuth();

  // Debug info
  console.log('🔍 ComplaintsList - userRole:', userRole);
  console.log('🔍 ComplaintsList - complaints:', complaints?.length || 0);
  console.log('🔍 ComplaintsList - classifications:', classifications);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by status if selected
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as ComplaintStatus);
      }

      // Filter by date if selected
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 1);
        query = query.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar denúncias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSoundSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sound_notifications_enabled')
        .single();

      if (error) throw error;
      setSoundEnabled(data.value === true);
    } catch (error) {
      console.error('Erro ao carregar configuração de som:', error);
    }
  };

  const fetchClassifications = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'public_classifications')
        .single();

      if (error) throw error;
      const value = data.value;
      setClassifications(Array.isArray(value) ? value.filter(item => typeof item === 'string') as string[] : []);
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwMZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAOUo8j6vGUdBjOQ3fHWeCwEJ3LL7eGPOgMVaLzt5JFPEC1YrdbqsGYfBjuV4PTXfjYEH2y8796iRgEXmMn96YFMAzKQz/fGdyQCK3rM7+WQRALEgbb+zG0lBR6J3PrHeCYEFWq88+aUUwGFgLT4028nBHuu5/ueNQMTcLjp4p9UE0+Y1vL6rWclBwTBpcl+3gABSHcA');
    audio.play().catch(e => console.log('Erro ao reproduzir som:', e));
  };

  const sendToAdmin = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'a_verificar' as ComplaintStatus,
          processed_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia enviada para verificação do administrador!",
      });
      
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao enviar para admin:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar denúncia para administrador",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    fetchSoundSetting();
    fetchClassifications();
    
    // Setup realtime updates para denúncias
    const complaintsChannel = supabase
      .channel('complaints-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'complaints'
        },
        (payload) => {
          console.log('📢 Realtime update:', payload);
          
          // Tocar som apenas para novas denúncias
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound();
          }
          
          // Atualizar lista de denúncias
          fetchComplaints();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });

    // Setup realtime updates for sound notifications (mantido para compatibilidade)
    const soundChannel = supabase
      .channel('complaint-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          if (soundEnabled) {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(complaintsChannel);
      supabase.removeChannel(soundChannel);
    };
  }, [soundEnabled]);

  const updateComplaintStatus = async (complaintId: string, newStatus: ComplaintStatus, systemIdentifier?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        processed_at: new Date().toISOString()
      };

      if (systemIdentifier) {
        updateData.system_identifier = systemIdentifier;
      }

      // Se for cadastrada, adicionar o nome do atendente atual
      if (newStatus === 'cadastrada' && profile) {
        updateData.assigned_to = profile.full_name;
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Denúncia marcada como ${newStatus}!`,
      });
      
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da denúncia",
        variant: "destructive",
      });
    }
  };

  const sendWhatsAppMessage = async (complaint: Complaint) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { complaintId: complaint.id }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Mensagem enviada via WhatsApp!",
      });
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem via WhatsApp",
        variant: "destructive",
      });
    }
  };

  const exportComplaintsPDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-complaints-pdf', {
        body: { 
          complaints: filteredComplaints,
          filters: { status: statusFilter, search: searchTerm }
        }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `denuncias-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    const colors = {
      nova: 'bg-yellow-500',
      cadastrada: 'bg-blue-500',
      finalizada: 'bg-green-500',
      a_verificar: 'bg-red-500'
    };
    
    const labels = {
      nova: 'Nova',
      cadastrada: 'Cadastrada',
      finalizada: 'Finalizada',
      a_verificar: 'A Verificar'
    };

    return (
      <Badge className={`${colors[status]} text-white`}>
        {labels[status]}
      </Badge>
    );
  };

  // Filter complaints based on search term
  const filteredComplaints = complaints.filter(complaint =>
    complaint.complainant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.occurrence_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.classification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando denúncias...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Input
            placeholder="Buscar denúncias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="nova">Novas</SelectItem>
              <SelectItem value="cadastrada">Cadastradas</SelectItem>
              <SelectItem value="finalizada">Finalizadas</SelectItem>
              {userRole !== 'atendente' && (
                <SelectItem value="a_verificar">A Verificar</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[180px]"
            placeholder="Filtrar por data"
          />
        </div>
        
        {userRole === 'super_admin' && (
          <Button onClick={exportComplaintsPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        )}
      </div>

      {/* Tabs for Complaints */}
      <Tabs defaultValue="novas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="novas">Novas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="novas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denunciante</TableHead>
                    <TableHead>Ocorrência</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Recebida</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints
                    .filter(complaint => {
                      // Para admin e super_admin, mostrar "nova" e "a_verificar" na aba Novas
                      if (userRole === 'admin' || userRole === 'super_admin') {
                        return complaint.status === 'nova' || complaint.status === 'a_verificar';
                      }
                      // Para atendentes, mostrar apenas "nova"
                      return complaint.status === 'nova';
                    })
                    .map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{complaint.complainant_name}</div>
                          <div className="text-sm text-gray-500">{complaint.complainant_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{complaint.occurrence_type}</div>
                          <div className="text-sm text-gray-500">{complaint.classification}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{complaint.occurrence_address}</div>
                          <div className="text-sm text-gray-500">{complaint.occurrence_neighborhood}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      <TableCell>
                        <div>
                          <div>{new Date(complaint.created_at).toLocaleDateString('pt-BR')}</div>
                          <div className="text-sm text-gray-500">{new Date(complaint.created_at).toLocaleTimeString('pt-BR')}</div>
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedComplaint(complaint)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Denúncia</DialogTitle>
                              </DialogHeader>
                              {selectedComplaint && (
                                <div className="space-y-6">
                                  {/* Dados do Reclamante */}
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Dados do Reclamante</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong>Nome:</strong> {selectedComplaint.complainant_name}
                                      </div>
                                      <div>
                                        <strong>Telefone:</strong> {selectedComplaint.complainant_phone}
                                      </div>
                                      <div>
                                        <strong>Tipo:</strong> {selectedComplaint.complainant_type}
                                      </div>
                                      <div>
                                        <strong>Bairro:</strong> {selectedComplaint.complainant_neighborhood}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="col-span-2">
                                        <strong>Endereço:</strong> {selectedComplaint.complainant_address}
                                      </div>
                                      <div>
                                        <strong>Número:</strong> {selectedComplaint.complainant_number || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>Quadra:</strong> {selectedComplaint.complainant_block || 'N/A'}
                                      </div>
                                    </div>
                                    {selectedComplaint.complainant_lot && (
                                      <div>
                                        <strong>Lote:</strong> {selectedComplaint.complainant_lot}
                                      </div>
                                    )}
                                  </div>

                                  {/* Endereço da Ocorrência */}
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Endereço da Ocorrência</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                      </div>
                                      <div>
                                        <strong>Bairro:</strong> {selectedComplaint.occurrence_neighborhood}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="col-span-2">
                                        <strong>Endereço:</strong> {selectedComplaint.occurrence_address}
                                      </div>
                                      <div>
                                        <strong>Número:</strong> {selectedComplaint.occurrence_number || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>Quadra:</strong> {selectedComplaint.occurrence_block || 'N/A'}
                                      </div>
                                    </div>
                                    {selectedComplaint.occurrence_lot && (
                                      <div>
                                        <strong>Lote:</strong> {selectedComplaint.occurrence_lot}
                                      </div>
                                    )}
                                    {selectedComplaint.occurrence_reference && (
                                      <div>
                                        <strong>Referência:</strong>
                                        <p className="text-sm bg-muted p-2 rounded mt-1">{selectedComplaint.occurrence_reference}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dados da Reclamação */}
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Dados da Reclamação</h3>
                                    <div>
                                      <strong>Narrativa:</strong>
                                      <p className="text-sm bg-muted p-3 rounded mt-1">{selectedComplaint.narrative}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {selectedComplaint.occurrence_date && (
                                        <div>
                                          <strong>Data:</strong> {format(new Date(selectedComplaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </div>
                                      )}
                                      {selectedComplaint.occurrence_time && (
                                        <div>
                                          <strong>Hora:</strong> {selectedComplaint.occurrence_time}
                                        </div>
                                      )}
                                      <div>
                                        <strong>Classificação:</strong> {selectedComplaint.classification}
                                      </div>
                                      {selectedComplaint.assigned_to && (
                                        <div>
                                          <strong>Atribuído a:</strong> {selectedComplaint.assigned_to}
                                        </div>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong>Status:</strong> {selectedComplaint.status}
                                      </div>
                                      {selectedComplaint.system_identifier && (
                                        <div>
                                          <strong>Identificador do Sistema:</strong> {selectedComplaint.system_identifier}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    {userRole === 'atendente' && selectedComplaint.status === 'nova' && (
                                      <Button 
                                        onClick={() => sendToAdmin(selectedComplaint.id)}
                                        variant="secondary"
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar para Admin
                                      </Button>
                                    )}
                                    {userRole !== 'admin' && selectedComplaint.status === 'nova' && userRole !== 'atendente' && (
                                      <Button 
                                        onClick={() => {
                                          const identifier = window.prompt('Digite o identificador do sistema:');
                                          if (identifier) {
                                            updateComplaintStatus(selectedComplaint.id, 'cadastrada', identifier);
                                          }
                                        }}
                                      >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Marcar como Cadastrada
                                      </Button>
                                    )}
                                    {userRole === 'atendente' && selectedComplaint.status === 'nova' && (
                                      <Button 
                                        onClick={() => {
                                          setRaiData({ rai: '', classification: '' });
                                          setShowRaiModal(true);
                                        }}
                                        variant="default"
                                      >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Cadastrar com RAI
                                      </Button>
                                    )}
                                    {userRole === 'super_admin' && (
                                      <Button onClick={() => sendWhatsAppMessage(selectedComplaint)}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Enviar WhatsApp
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                             </DialogContent>
                           </Dialog>
                           
                             {userRole === 'atendente' && complaint.status === 'nova' && (
                               <Button 
                                 size="sm" 
                                 variant="secondary"
                                 onClick={() => sendToAdmin(complaint.id)}
                                 title="Enviar para Admin"
                               >
                                 <Send className="h-4 w-4 mr-1" />
                                 Enviar
                               </Button>
                             )}
                             
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denunciante</TableHead>
                    <TableHead>Ocorrência</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Recebida</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints
                    .filter(complaint => {
                      // Excluir "nova" da aba histórico
                      if (complaint.status === 'nova') return false;
                      // Para admin e super_admin, excluir "a_verificar" do histórico (pois aparece em Novas)
                      if ((userRole === 'admin' || userRole === 'super_admin') && complaint.status === 'a_verificar') return false;
                      // Para atendentes, ocultar denúncias "A Verificar" 
                      if (userRole === 'atendente' && complaint.status === 'a_verificar') return false;
                      return true;
                    })
                    .map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{complaint.complainant_name}</div>
                          <div className="text-sm text-gray-500">{complaint.complainant_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{complaint.occurrence_type}</div>
                          <div className="text-sm text-gray-500">{complaint.classification}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{complaint.occurrence_address}</div>
                          <div className="text-sm text-gray-500">{complaint.occurrence_neighborhood}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      <TableCell>
                        <div>
                          <div>{new Date(complaint.created_at).toLocaleDateString('pt-BR')}</div>
                          <div className="text-sm text-gray-500">{new Date(complaint.created_at).toLocaleTimeString('pt-BR')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {complaint.processed_at ? (
                          <div>
                            <div>{new Date(complaint.processed_at).toLocaleDateString('pt-BR')}</div>
                            <div className="text-sm text-gray-500">{new Date(complaint.processed_at).toLocaleTimeString('pt-BR')}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {complaint.assigned_to || <span className="text-gray-400">-</span>}
                      </TableCell>
                       <TableCell>
                         <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedComplaint(complaint)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Denúncia</DialogTitle>
                              </DialogHeader>
                              {selectedComplaint && (
                                <div className="space-y-6">
                                  {/* Informações de Controle - mostrar apenas no histórico */}
                                  {selectedComplaint.status !== 'nova' && (
                                    <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                                      <h3 className="text-lg font-semibold text-primary border-b pb-2">Informações de Controle</h3>
                                      <div className="grid grid-cols-3 gap-4">
                                        <div>
                                          <strong>Data/Hora Recebida:</strong>
                                          <div className="text-sm">
                                            <div>{new Date(selectedComplaint.created_at).toLocaleDateString('pt-BR')}</div>
                                            <div className="text-gray-500">{new Date(selectedComplaint.created_at).toLocaleTimeString('pt-BR')}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <strong>Data/Hora Cadastro:</strong>
                                          <div className="text-sm">
                                            {selectedComplaint.processed_at ? (
                                              <>
                                                <div>{new Date(selectedComplaint.processed_at).toLocaleDateString('pt-BR')}</div>
                                                <div className="text-gray-500">{new Date(selectedComplaint.processed_at).toLocaleTimeString('pt-BR')}</div>
                                              </>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <strong>Atendente:</strong>
                                          <div className="text-sm">
                                            {selectedComplaint.assigned_to || <span className="text-gray-400">-</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Dados do Reclamante */}
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Dados do Reclamante</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong>Nome:</strong> {selectedComplaint.complainant_name}
                                      </div>
                                      <div>
                                        <strong>Telefone:</strong> {selectedComplaint.complainant_phone}
                                      </div>
                                      <div>
                                        <strong>Tipo:</strong> {selectedComplaint.complainant_type}
                                      </div>
                                      <div>
                                        <strong>Bairro:</strong> {selectedComplaint.complainant_neighborhood}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="col-span-2">
                                        <strong>Endereço:</strong> {selectedComplaint.complainant_address}
                                      </div>
                                      <div>
                                        <strong>Número:</strong> {selectedComplaint.complainant_number || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>Quadra:</strong> {selectedComplaint.complainant_block || 'N/A'}
                                      </div>
                                    </div>
                                    {selectedComplaint.complainant_lot && (
                                      <div>
                                        <strong>Lote:</strong> {selectedComplaint.complainant_lot}
                                      </div>
                                    )}
                                  </div>

                                  {/* Endereço da Ocorrência */}
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Endereço da Ocorrência</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                      </div>
                                      <div>
                                        <strong>Bairro:</strong> {selectedComplaint.occurrence_neighborhood}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="col-span-2">
                                        <strong>Endereço:</strong> {selectedComplaint.occurrence_address}
                                      </div>
                                      <div>
                                        <strong>Número:</strong> {selectedComplaint.occurrence_number || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>Quadra:</strong> {selectedComplaint.occurrence_block || 'N/A'}
                                      </div>
                                    </div>
                                    {selectedComplaint.occurrence_lot && (
                                      <div>
                                        <strong>Lote:</strong> {selectedComplaint.occurrence_lot}
                                      </div>
                                    )}
                                    {selectedComplaint.occurrence_reference && (
                                      <div>
                                        <strong>Referência:</strong>
                                        <p className="text-sm bg-muted p-2 rounded mt-1">{selectedComplaint.occurrence_reference}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dados da Reclamação */}
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-primary border-b pb-2">Dados da Reclamação</h3>
                                    <div>
                                      <strong>Narrativa:</strong>
                                      <p className="text-sm bg-muted p-3 rounded mt-1">{selectedComplaint.narrative}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {selectedComplaint.occurrence_date && (
                                        <div>
                                          <strong>Data:</strong> {format(new Date(selectedComplaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </div>
                                      )}
                                      {selectedComplaint.occurrence_time && (
                                        <div>
                                          <strong>Hora:</strong> {selectedComplaint.occurrence_time}
                                        </div>
                                      )}
                                      <div>
                                        <strong>Classificação:</strong> {selectedComplaint.classification}
                                      </div>
                                      {selectedComplaint.assigned_to && (
                                        <div>
                                          <strong>Atribuído a:</strong> {selectedComplaint.assigned_to}
                                        </div>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <strong>Status:</strong> {selectedComplaint.status}
                                      </div>
                                      {selectedComplaint.system_identifier && (
                                        <div>
                                          <strong>Identificador do Sistema:</strong> {selectedComplaint.system_identifier}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                             </DialogContent>
                           </Dialog>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {filteredComplaints.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhuma denúncia encontrada com os filtros aplicados.
        </div>
      )}

      {/* Modal RAI usando createPortal para aparecer acima de tudo */}
      {showRaiModal && selectedComplaint && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-background p-6 rounded-lg min-w-[400px] shadow-xl border">
            <h3 className="text-lg font-semibold mb-4">Cadastrar Denúncia</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="rai-input">Número RAI *</Label>
                <Input
                  id="rai-input"
                  type="text"
                  placeholder="Digite o número RAI"
                  value={raiData.rai}
                  onChange={(e) => setRaiData({ ...raiData, rai: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="classification-select">Classificação *</Label>
                <Select 
                  value={raiData.classification} 
                  onValueChange={(value) => setRaiData({ ...raiData, classification: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma classificação..." />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {classifications.map((classification) => (
                      <SelectItem key={classification} value={classification}>
                        {classification}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRaiModal(false);
                  setRaiData({ rai: '', classification: '' });
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!raiData.rai.trim()) {
                    toast({
                      title: "Erro",
                      description: "Por favor, digite o número RAI",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (!raiData.classification) {
                    toast({
                      title: "Erro", 
                      description: "Por favor, selecione uma classificação",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  updateComplaintStatus(selectedComplaint.id, 'cadastrada', raiData.rai);
                  setShowRaiModal(false);
                  setRaiData({ rai: '', classification: '' });
                }}
              >
                Cadastrar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};