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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Download, MessageSquare, Calendar, Send, Archive, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = 'nova' | 'cadastrada' | 'finalizada' | 'a_verificar' | 'verificado';

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
  created_at: string;
  updated_at: string;
  processed_at?: string;
  attendant_id?: string;
  system_identifier?: string;
  whatsapp_sent?: boolean;
}

export const ComplaintsList = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [raiData, setRaiData] = useState({ rai: '', classification: '' });
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  
  // Get user role from the user object
  const userRole = user?.role || 'atendente';

  useEffect(() => {
    fetchComplaints();
    fetchClassifications();
    fetchSoundSettings();
  }, [userRole]);

  useEffect(() => {
    const subscription = setupRealtimeUpdates();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userRole]);

  const setupRealtimeUpdates = () => {
    console.log(`🔗 Configurando realtime para: ${userRole}`);
    
    const channel = supabase
      .channel(`complaints-changes-${userRole}-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        (payload) => {
          console.log(`📢 REALTIME UPDATE RECEBIDO (${userRole}):`, payload);
          console.log(`📢 Event Type (${userRole}):`, payload.eventType);
          console.log(`📢 Novos dados (${userRole}):`, payload.new);
          
          if (payload.eventType === 'INSERT' && payload.new && payload.new.status === 'nova') {
            console.log(`🔊 Nova denúncia detectada para ${userRole}, tocando som...`);
            playNotificationSound();
          }
          
          console.log(`🔄 Atualizando lista de denúncias (${userRole})...`);
          refetch();
        }
      )
      .subscribe();

    return channel;
  };

  const refetch = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`🔍 ComplaintsList - userRole: ${userRole}`);
      console.log(`🔍 ComplaintsList - complaints: ${data?.length || 0}`);
      console.log(`🔍 ComplaintsList - classifications: ${JSON.stringify(classifications)}`);
      
      setComplaints(data as Complaint[]);
    } catch (error) {
      console.error('Erro ao recarregar denúncias:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          attendant:users!complaints_attendant_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`🔍 ComplaintsList - userRole: ${userRole}`);
      console.log(`🔍 ComplaintsList - complaints: ${data?.length || 0}`);
      console.log(`🔍 ComplaintsList - classifications: ${JSON.stringify(classifications)}`);
      
      setComplaints(data as Complaint[]);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSoundSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sound_notifications_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setSoundEnabled(data?.value === true);
    } catch (error) {
      console.error('Erro ao carregar configurações de som:', error);
    }
  };

  const fetchClassifications = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'classifications')
        .single();

      if (error) throw error;
      const value = data.value;
      setClassifications(Array.isArray(value) ? value.filter(item => typeof item === 'string') as string[] : []);
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    }
  };

  const playNotificationSound = () => {
    console.log('🔊 Tentando tocar som - soundEnabled:', soundEnabled);
    
    if (!soundEnabled) {
      console.log('🔇 Som desabilitado nas configurações');
      return;
    }

    try {
      // Criar um áudio mais simples e confiável
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwMZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAOUo8j6vGUdBjOQ3fHWeCwEJ3LL7eGPOgMVaLzt5JFPEC1YrdbqsGYfBjuV4PTXfjYEH2y8796iRgEXmMn96YFMAzKQz/fGdyQCK3rM7+WQRALEgbb+zG0lBR6J3PrHeCYEFWq88+aUUwGFgLT4028nBHuu5/ueNQMTcLjp4p9UE0+Y1vL6rWclBwTBpcl+3gABSHcA';
      audio.volume = 0.8;
      audio.preload = 'auto';
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Som tocado com sucesso!');
          })
          .catch((error) => {
            console.log('❌ Erro ao tocar som principal, tentando fallback:', error);
            
            // Fallback: criar som usando Web Audio API
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.5);
              
              console.log('✅ Som fallback tocado com sucesso!');
            } catch (fallbackError) {
              console.log('❌ Erro no fallback também:', fallbackError);
            }
          });
      }
    } catch (error) {
      console.log('❌ Erro ao criar áudio:', error);
    }
  };

  const sendToAdmin = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'a_verificar',
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

  const updateComplaintStatus = async (id: string, status: ComplaintStatus, systemIdentifier?: string) => {
    try {
      const updateData: any = {
        status,
        attendant_id: user?.id,
        processed_at: new Date().toISOString(),
        classification: raiData.classification || ''
      };

      if (systemIdentifier) {
        updateData.system_identifier = systemIdentifier;
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Denúncia ${status === 'cadastrada' ? 'cadastrada' : 'atualizada'} com sucesso!`,
      });
      
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar denúncia",
        variant: "destructive",
      });
    }
  };

  const archiveComplaint = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'finalizada' as ComplaintStatus,
          processed_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia arquivada no histórico",
      });
      
      setSelectedComplaint(null);
      refetch();
    } catch (error) {
      console.error('Erro ao arquivar denúncia:', error);
      toast({
        title: "Erro",
        description: "Erro ao arquivar denúncia",
        variant: "destructive",
      });
    }
  };

  const markAsVerified = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'verificado' as ComplaintStatus,
          processed_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia marcada como verificada e retornada para o atendente!",
      });
      
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao marcar como verificada:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar denúncia como verificada",
        variant: "destructive",
      });
    }
  };

  const sendWhatsAppMessage = async (complaint: Complaint) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-secure', {
        body: { 
          phone: complaint.complainant_phone,
          complaintId: complaint.id,
          message: `Olá ${complaint.complainant_name}, sua denúncia foi registrada com sucesso!`
        }
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
      const link = document.createElement('a');
      link.href = url;
      link.download = `denuncias-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
      a_verificar: 'bg-red-500',
      verificado: 'bg-purple-500'
    };
    
    const labels = {
      nova: 'Nova',
      cadastrada: 'Cadastrada',
      finalizada: 'Finalizada',
      a_verificar: 'A Verificar',
      verificado: 'Verificado'
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
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, endereço ou classificação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={exportComplaintsPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Tabs defaultValue="novas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="novas">Novas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        
        {/* Tab Novas */}
        <TabsContent value="novas">
          <Card>
            <CardHeader>
              <CardTitle>Denúncias Novas</CardTitle>
            </CardHeader>
            <CardContent>
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
                      // Para admin e super_admin, mostrar "nova", "a_verificar" e "verificado" na aba Novas
                      if (userRole === 'admin' || userRole === 'super_admin') {
                        return complaint.status === 'nova' || complaint.status === 'a_verificar' || complaint.status === 'verificado';
                      }
                      // Para atendentes, mostrar "nova" e "verificado"
                      return complaint.status === 'nova' || complaint.status === 'verificado';
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
                          <div>{complaint.occurrence_type}</div>
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
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setSelectedComplaint(complaint)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detalhes da Denúncia</DialogTitle>
                                </DialogHeader>
                               {selectedComplaint && (
                                 <div className="space-y-6">
                                   <div className="space-y-4">
                                     <h3 className="text-lg font-semibold">Dados do Denunciante</h3>
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
                                     
                                     <div>
                                       <strong>Endereço:</strong> {selectedComplaint.complainant_address}
                                       {selectedComplaint.complainant_number && ` nº ${selectedComplaint.complainant_number}`}
                                       {selectedComplaint.complainant_block && `, Quadra ${selectedComplaint.complainant_block}`}
                                       {selectedComplaint.complainant_lot && `, Lote ${selectedComplaint.complainant_lot}`}
                                     </div>
                                   </div>

                                   <div className="space-y-4">
                                     <h3 className="text-lg font-semibold">Endereço da Ocorrência</h3>
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                       </div>
                                       <div>
                                         <strong>Bairro:</strong> {selectedComplaint.occurrence_neighborhood}
                                       </div>
                                     </div>
                                     
                                     <div>
                                       <strong>Endereço:</strong> {selectedComplaint.occurrence_address}
                                       {selectedComplaint.occurrence_number && ` nº ${selectedComplaint.occurrence_number}`}
                                       {selectedComplaint.occurrence_block && `, Quadra ${selectedComplaint.occurrence_block}`}
                                       {selectedComplaint.occurrence_lot && `, Lote ${selectedComplaint.occurrence_lot}`}
                                     </div>
                                     
                                     {selectedComplaint.occurrence_reference && (
                                       <div>
                                         <strong>Referência:</strong> {selectedComplaint.occurrence_reference}
                                       </div>
                                     )}
                                   </div>

                                   <div className="space-y-4">
                                     <h3 className="text-lg font-semibold">Dados da Reclamação</h3>
                                     
                                     <div>
                                       <strong>Narrativa:</strong>
                                       <p className="mt-2 p-3 bg-gray-50 rounded-md">{selectedComplaint.narrative}</p>
                                     </div>
                                     
                                     <div className="grid grid-cols-2 gap-4">
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
                                   
                                   {/* Formulário RAI - mostrar para atendente e denúncia nova ou verificada */}
                                   {(userRole === 'atendente' || userRole === 'authenticated') && (selectedComplaint.status === 'nova' || selectedComplaint.status === 'verificado') && (
                                     <div className="space-y-4 border-t pt-4">
                                       <h4 className="text-md font-semibold text-primary">Cadastrar com RAI</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                         <div>
                                           <Label htmlFor="rai-input">Número RAI *</Label>
                                           <Input
                                             id="rai-input"
                                             type="text"
                                             placeholder="Digite o número RAI"
                                             value={raiData.rai}
                                             onChange={(e) => setRaiData(prev => ({ ...prev, rai: e.target.value }))}
                                           />
                                         </div>
                                         <div>
                                           <Label htmlFor="classification-select">Classificação *</Label>
                                           <Select 
                                             value={raiData.classification} 
                                             onValueChange={(value) => setRaiData(prev => ({ ...prev, classification: value }))}
                                           >
                                             <SelectTrigger>
                                               <SelectValue placeholder="Selecione uma classificação..." />
                                             </SelectTrigger>
                                             <SelectContent>
                                               {classifications.map((classification) => (
                                                 <SelectItem key={classification} value={classification}>
                                                   {classification}
                                                 </SelectItem>
                                               ))}
                                             </SelectContent>
                                           </Select>
                                         </div>
                                       </div>
                                     </div>
                                   )}

                                     <div className="flex flex-wrap gap-2 pt-4 border-t">
                                       {/* Botões para ATENDENTE com denúncia NOVA */}
                                       {(userRole === 'atendente' || userRole === 'authenticated') && selectedComplaint.status === 'nova' && (
                                        <>
                                          <Button 
                                            onClick={() => sendToAdmin(selectedComplaint.id)}
                                            variant="secondary"
                                          >
                                            <Send className="h-4 w-4 mr-2" />
                                            Enviar para Admin
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
                                              setRaiData({ rai: '', classification: '' });
                                            }}
                                            variant="default"
                                          >
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Cadastrar com RAI
                                          </Button>
                                        </>
                                      )}

                                      {/* Botões para ATENDENTE com denúncia VERIFICADA */}
                                      {(userRole === 'atendente' || userRole === 'authenticated') && selectedComplaint.status === 'verificado' && (
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
                                            setRaiData({ rai: '', classification: '' });
                                          }}
                                          variant="default"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Cadastrar com RAI
                                        </Button>
                                      )}
                                       
                                      {/* Botões para ADMIN/SUPER_ADMIN com denúncia A_VERIFICAR */}
                                      {(userRole === 'admin' || userRole === 'super_admin') && selectedComplaint.status === 'a_verificar' && (
                                        <>
                                          <Button 
                                            onClick={() => archiveComplaint(selectedComplaint.id)}
                                            variant="destructive"
                                          >
                                            <Archive className="h-4 w-4 mr-2" />
                                            Arquivar
                                          </Button>
                                          
                                          <Button 
                                            onClick={() => markAsVerified(selectedComplaint.id)}
                                            variant="default"
                                          >
                                            <Check className="h-4 w-4 mr-2" />
                                            Verificado
                                          </Button>
                                        </>
                                      )}
                                     
                                      {/* Botão para SUPER_ADMIN */}
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

       {/* Tab Histórico */}
       <TabsContent value="historico">
         <Card>
           <CardHeader>
             <CardTitle>Histórico de Denúncias</CardTitle>
           </CardHeader>
           <CardContent>
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
                     // Excluir "nova" e "verificado" da aba histórico
                     if (complaint.status === 'nova' || complaint.status === 'verificado') return false;
                     // Para admin e super_admin, excluir "a_verificar" do histórico (pois aparece em Novas)
                     if ((userRole === 'admin' || userRole === 'super_admin') && complaint.status === 'a_verificar') return false;
                     // Para atendentes, ocultar denúncias "A Verificar" e "finalizada"
                     if (userRole === 'atendente' && (complaint.status === 'a_verificar' || complaint.status === 'finalizada')) return false;
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
                         <div>{complaint.occurrence_type}</div>
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
                        {(complaint as any).attendant?.full_name ? (
                          <span className="text-sm">{(complaint as any).attendant.full_name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                     <TableCell>
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={() => setSelectedComplaint(complaint)}
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             Ver
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                           <DialogHeader>
                             <DialogTitle>Detalhes da Denúncia</DialogTitle>
                           </DialogHeader>
                            {selectedComplaint && (
                              <div className="space-y-6">
                                {/* Informações do topo para histórico */}
                                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <strong>Data Recebida:</strong>
                                    <div>{new Date(selectedComplaint.created_at).toLocaleDateString('pt-BR')}</div>
                                    <div className="text-sm text-gray-500">{new Date(selectedComplaint.created_at).toLocaleTimeString('pt-BR')}</div>
                                  </div>
                                  <div>
                                    <strong>Data Cadastrada:</strong>
                                    {selectedComplaint.processed_at ? (
                                      <div>
                                        <div>{new Date(selectedComplaint.processed_at).toLocaleDateString('pt-BR')}</div>
                                        <div className="text-sm text-gray-500">{new Date(selectedComplaint.processed_at).toLocaleTimeString('pt-BR')}</div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>Atendente:</strong>
                                    <div>
                                      {(selectedComplaint as any).attendant?.full_name || 'Não informado'}
                                    </div>
                                  </div>
                                </div>
                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold">Dados do Denunciante</h3>
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
                                 
                                 <div>
                                   <strong>Endereço:</strong> {selectedComplaint.complainant_address}
                                   {selectedComplaint.complainant_number && ` nº ${selectedComplaint.complainant_number}`}
                                   {selectedComplaint.complainant_block && `, Quadra ${selectedComplaint.complainant_block}`}
                                   {selectedComplaint.complainant_lot && `, Lote ${selectedComplaint.complainant_lot}`}
                                 </div>
                               </div>

                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold">Endereço da Ocorrência</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                     <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                   </div>
                                   <div>
                                     <strong>Bairro:</strong> {selectedComplaint.occurrence_neighborhood}
                                   </div>
                                 </div>
                                 
                                 <div>
                                   <strong>Endereço:</strong> {selectedComplaint.occurrence_address}
                                   {selectedComplaint.occurrence_number && ` nº ${selectedComplaint.occurrence_number}`}
                                   {selectedComplaint.occurrence_block && `, Quadra ${selectedComplaint.occurrence_block}`}
                                   {selectedComplaint.occurrence_lot && `, Lote ${selectedComplaint.occurrence_lot}`}
                                 </div>
                                 
                                 {selectedComplaint.occurrence_reference && (
                                   <div>
                                     <strong>Referência:</strong> {selectedComplaint.occurrence_reference}
                                   </div>
                                 )}
                               </div>

                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold">Dados da Reclamação</h3>
                                 
                                 <div>
                                   <strong>Narrativa:</strong>
                                   <p className="mt-2 p-3 bg-gray-50 rounded-md">{selectedComplaint.narrative}</p>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4">
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

   </div>
 );
};