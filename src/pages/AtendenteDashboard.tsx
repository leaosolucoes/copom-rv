import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, CheckCircle, Clock, LogOut, AlertTriangle, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  status: 'nova' | 'cadastrada' | 'finalizada';
  system_identifier?: string;
  processed_at?: string;
  created_at: string;
}

export default function AtendenteDashboard() {
  console.log('🔍 AtendenteDashboard: Componente iniciado');
  
  const { profile, signOut, isLoading } = useSupabaseAuth();
  console.log('🔍 AtendenteDashboard: Dados do hook:', { profile, isLoading });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [systemIdentifier, setSystemIdentifier] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(true);

  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/acesso');
      return;
    }

    if (profile) {
      loadComplaints();
    }
  }, [profile, navigate, isLoading]);

  const loadComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as denúncias",
        variant: "destructive"
      });
    } finally {
      setIsLoadingComplaints(false);
    }
  };

  const handleProcessComplaint = async (complaintId: string) => {
    if (!systemIdentifier.trim()) {
      toast({
        title: "Identificador obrigatório",
        description: "Por favor, informe o identificador do sistema",
        variant: "destructive"
      });
      return;
    }

    console.log('🔄 Processando denúncia:', complaintId, 'com identificador:', systemIdentifier);
    setIsProcessing(true);

    try {
      console.log('📝 Estado antes da atualização otimista:', complaints.find(c => c.id === complaintId)?.status);
      
      // Atualização otimista do estado local
      setComplaints(prevComplaints => {
        const updatedComplaints = prevComplaints.map(complaint => 
          complaint.id === complaintId 
            ? { ...complaint, status: 'cadastrada' as const, system_identifier: systemIdentifier, processed_at: new Date().toISOString() }
            : complaint
        );
        
        console.log('✅ Estado após atualização otimista:', updatedComplaints.find(c => c.id === complaintId)?.status);
        return updatedComplaints;
      });

      const { error } = await supabase
        .from('complaints')
        .update({
          status: 'cadastrada',
          system_identifier: systemIdentifier,
          processed_at: new Date().toISOString(),
          attendant_id: profile?.id
        })
        .eq('id', complaintId);

      if (error) {
        console.error('❌ Erro na atualização do banco:', error);
        // Reverter mudança otimista em caso de erro
        setComplaints(prevComplaints => 
          prevComplaints.map(complaint => 
            complaint.id === complaintId 
              ? { ...complaint, status: 'nova' as const, system_identifier: null, processed_at: null }
              : complaint
          )
        );
        throw error;
      }

      console.log('✅ Denúncia atualizada no banco com sucesso');

      toast({
        title: "Denúncia cadastrada com sucesso!",
        description: "A denúncia foi marcada como cadastrada no sistema",
      });

      // Limpar campos e fechar dialog
      setSystemIdentifier("");
      setSelectedComplaint(null);
      
      console.log('🔄 Recarregando lista de denúncias...');
      // Recarregar dados para garantir sincronização
      await loadComplaints();
      console.log('✅ Lista recarregada');
      
    } catch (error) {
      console.error('❌ Erro ao processar denúncia:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a denúncia",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nova':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Nova</Badge>;
      case 'cadastrada':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Cadastrada</Badge>;
      case 'finalizada':
        return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Finalizada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const newComplaints = complaints.filter(c => c.status === 'nova');
  const processedComplaints = complaints.filter(c => c.status !== 'nova');

  if (isLoading || isLoadingComplaints) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p>Carregando...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} />
      
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">Painel do Atendente</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.full_name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <div className="text-2xl font-bold text-destructive">{newComplaints.length}</div>
              <div className="text-sm text-muted-foreground">Denúncias Novas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold text-success">{processedComplaints.length}</div>
              <div className="text-sm text-muted-foreground">Processadas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{complaints.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="novas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="novas" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Novas ({newComplaints.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Histórico ({processedComplaints.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="novas" className="space-y-4">
            {newComplaints.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma denúncia nova pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {newComplaints.map((complaint) => (
                  <Card key={complaint.id} className="shadow-form">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{complaint.complainant_name}</CardTitle>
                        {getStatusBadge(complaint.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {complaint.occurrence_date && complaint.occurrence_time && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(complaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })} às {complaint.occurrence_time}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {complaint.occurrence_neighborhood}
                        </div>
                      </div>
                      
                      <p className="text-sm mb-4 line-clamp-2">{complaint.narrative}</p>
                      
                       <div className="flex gap-2">
                         <Dialog>
                           <DialogTrigger asChild>
                             <Button variant="outline" size="sm" onClick={() => setSelectedComplaint(complaint)}>
                               <Eye className="h-4 w-4 mr-2" />
                               Ver Detalhes
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
                                       <Label className="font-semibold">Nome do Reclamante</Label>
                                       <p>{selectedComplaint.complainant_name}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Telefone</Label>
                                       <p>{selectedComplaint.complainant_phone}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Tipo</Label>
                                       <p>{selectedComplaint.complainant_type}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Bairro</Label>
                                       <p>{selectedComplaint.complainant_neighborhood}</p>
                                     </div>
                                   </div>
                                   <div className="grid grid-cols-4 gap-4">
                                     <div className="col-span-2">
                                       <Label className="font-semibold">Endereço</Label>
                                       <p>{selectedComplaint.complainant_address}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Número</Label>
                                       <p>{selectedComplaint.complainant_number || 'N/A'}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Quadra</Label>
                                       <p>{selectedComplaint.complainant_block || 'N/A'}</p>
                                     </div>
                                   </div>
                                   {selectedComplaint.complainant_lot && (
                                     <div>
                                       <Label className="font-semibold">Lote</Label>
                                       <p>{selectedComplaint.complainant_lot}</p>
                                     </div>
                                   )}
                                 </div>

                                 {/* Endereço da Ocorrência */}
                                 <div className="space-y-3">
                                   <h3 className="text-lg font-semibold text-primary border-b pb-2">Endereço da Ocorrência</h3>
                                   <div className="grid grid-cols-2 gap-4">
                                     <div>
                                       <Label className="font-semibold">Tipo de Ocorrência</Label>
                                       <p>{selectedComplaint.occurrence_type}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Bairro</Label>
                                       <p>{selectedComplaint.occurrence_neighborhood}</p>
                                     </div>
                                   </div>
                                   <div className="grid grid-cols-4 gap-4">
                                     <div className="col-span-2">
                                       <Label className="font-semibold">Endereço</Label>
                                       <p>{selectedComplaint.occurrence_address}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Número</Label>
                                       <p>{selectedComplaint.occurrence_number || 'N/A'}</p>
                                     </div>
                                     <div>
                                       <Label className="font-semibold">Quadra</Label>
                                       <p>{selectedComplaint.occurrence_block || 'N/A'}</p>
                                     </div>
                                   </div>
                                   {selectedComplaint.occurrence_lot && (
                                     <div>
                                       <Label className="font-semibold">Lote</Label>
                                       <p>{selectedComplaint.occurrence_lot}</p>
                                     </div>
                                   )}
                                   {selectedComplaint.occurrence_reference && (
                                     <div>
                                       <Label className="font-semibold">Referência</Label>
                                       <p className="text-sm bg-muted p-2 rounded">{selectedComplaint.occurrence_reference}</p>
                                     </div>
                                   )}
                                 </div>

                                 {/* Dados da Reclamação */}
                                 <div className="space-y-3">
                                   <h3 className="text-lg font-semibold text-primary border-b pb-2">Dados da Reclamação</h3>
                                   <div>
                                     <Label className="font-semibold">Narrativa</Label>
                                     <p className="text-sm bg-muted p-3 rounded mt-1">{selectedComplaint.narrative}</p>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                     {selectedComplaint.occurrence_date && (
                                       <div>
                                         <Label className="font-semibold">Data</Label>
                                         <p>{format(new Date(selectedComplaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                                       </div>
                                     )}
                                     {selectedComplaint.occurrence_time && (
                                       <div>
                                         <Label className="font-semibold">Hora</Label>
                                         <p>{selectedComplaint.occurrence_time}</p>
                                       </div>
                                     )}
                                     <div>
                                       <Label className="font-semibold">Classificação</Label>
                                       <p>{selectedComplaint.classification}</p>
                                     </div>
                                     {selectedComplaint.assigned_to && (
                                       <div>
                                         <Label className="font-semibold">Atribuído a</Label>
                                         <p>{selectedComplaint.assigned_to}</p>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                                 
                                 {selectedComplaint.status === 'nova' && (
                                   <div className="space-y-3 pt-4 border-t">
                                     <Label htmlFor="system_id">Identificador do Sistema</Label>
                                     <Input
                                       id="system_id"
                                       value={systemIdentifier}
                                       onChange={(e) => setSystemIdentifier(e.target.value)}
                                       placeholder="Ex: DENUNCIA-2024-001"
                                     />
                                     <Button
                                       className="bg-green-600 hover:bg-green-700 text-white w-full"
                                       onClick={() => handleProcessComplaint(selectedComplaint.id)}
                                       disabled={isProcessing}
                                     >
                                       {isProcessing ? "Processando..." : "Marcar como Cadastrada"}
                                     </Button>
                                   </div>
                                 )}
                               </div>
                             )}
                           </DialogContent>
                         </Dialog>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            {processedComplaints.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma denúncia processada ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {processedComplaints.map((complaint) => (
                  <Card key={complaint.id} className="shadow-soft">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{complaint.complainant_name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {complaint.system_identifier && (
                            <Badge variant="outline" className="text-xs">
                              {complaint.system_identifier}
                            </Badge>
                          )}
                          {getStatusBadge(complaint.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-muted-foreground">
                        {complaint.occurrence_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(complaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {complaint.occurrence_neighborhood}
                        </div>
                        {complaint.processed_at && (
                          <div className="text-xs text-success">
                            Processada: {format(new Date(complaint.processed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm line-clamp-2">{complaint.narrative}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}