
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, MessageSquare, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = Database['public']['Enums']['complaint_status'];

interface Complaint {
  id: string;
  complainant_name: string;
  complainant_phone: string;
  occurrence_type: string;
  occurrence_address: string;
  occurrence_neighborhood: string;
  classification: string;
  status: ComplaintStatus;
  created_at: string;
  processed_at: string | null;
  attendant_id: string | null;
  system_identifier: string | null;
  narrative: string;
  occurrence_date: string;
  occurrence_time: string;
  whatsapp_sent: boolean | null;
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
  const { toast } = useToast();

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by status if selected
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
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

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const updateComplaintStatus = async (complaintId: string, newStatus: ComplaintStatus, systemIdentifier?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        processed_at: new Date().toISOString()
      };

      if (systemIdentifier) {
        updateData.system_identifier = systemIdentifier;
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
      finalizada: 'bg-green-500'
    };
    
    const labels = {
      nova: 'Nova',
      cadastrada: 'Cadastrada',
      finalizada: 'Finalizada'
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
            </SelectContent>
          </Select>
        </div>
        
        {userRole === 'super_admin' && (
          <Button onClick={exportComplaintsPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        )}
      </div>

      {/* Complaints Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denunciante</TableHead>
                <TableHead>Ocorrência</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.map((complaint) => (
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
                    {new Date(complaint.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedComplaint(complaint)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Denúncia</DialogTitle>
                          </DialogHeader>
                          {selectedComplaint && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <strong>Denunciante:</strong> {selectedComplaint.complainant_name}
                                </div>
                                <div>
                                  <strong>Telefone:</strong> {selectedComplaint.complainant_phone}
                                </div>
                                <div>
                                  <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                </div>
                                <div>
                                  <strong>Classificação:</strong> {selectedComplaint.classification}
                                </div>
                                <div>
                                  <strong>Data da Ocorrência:</strong> {new Date(selectedComplaint.occurrence_date).toLocaleDateString('pt-BR')}
                                </div>
                                <div>
                                  <strong>Horário:</strong> {selectedComplaint.occurrence_time}
                                </div>
                              </div>
                              <div>
                                <strong>Endereço da Ocorrência:</strong> {selectedComplaint.occurrence_address}, {selectedComplaint.occurrence_neighborhood}
                              </div>
                              <div>
                                <strong>Narrativa:</strong>
                                <p className="mt-2 p-3 bg-gray-50 rounded">{selectedComplaint.narrative}</p>
                              </div>
                              {selectedComplaint.system_identifier && (
                                <div>
                                  <strong>Identificador do Sistema:</strong> {selectedComplaint.system_identifier}
                                </div>
                              )}
                              <div className="flex space-x-2">
                                {userRole !== 'admin' && selectedComplaint.status === 'nova' && (
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredComplaints.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhuma denúncia encontrada com os filtros aplicados.
        </div>
      )}
    </div>
  );
};
