import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Eye, RefreshCw, Download, FileText, Filter, Search, Calendar } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  user_name: string;
  consultation_type: 'CPF' | 'CNPJ' | 'CEP';
  searched_data: string;
  search_result: any;
  success: boolean;
  error_message: string | null;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
  user_id: string;
}

export function ConsultationAuditDashboard() {
  console.log('🚀 ConsultationAuditDashboard: Componente iniciado');
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      console.log('🔍 ConsultationAuditDashboard: Iniciando busca de logs...');
      
      let query = supabase
        .from('consultation_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros se necessário
      if (typeFilter !== 'all') {
        query = query.eq('consultation_type', typeFilter as 'CPF' | 'CNPJ' | 'CEP');
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('success', statusFilter === 'success');
      }
      
      if (dateFromFilter) {
        query = query.gte('created_at', dateFromFilter + 'T00:00:00.000Z');
      }
      
      if (dateToFilter) {
        query = query.lte('created_at', dateToFilter + 'T23:59:59.999Z');
      }

      const { data, error } = await query;

      console.log('🔍 ConsultationAuditDashboard: Resposta da consulta:', { data, error });

      if (error) {
        console.error('❌ ConsultationAuditDashboard: Erro na consulta:', error);
        toast.error(`Erro ao carregar logs: ${error.message}`);
        return;
      }
      
      console.log('✅ ConsultationAuditDashboard: Logs encontrados:', data?.length || 0);
      setLogs(data || []);
      
      if (data && data.length > 0) {
        toast.success(`${data.length} logs carregados com sucesso!`);
      } else {
        toast.info('Nenhum log de auditoria encontrado');
      }
      
    } catch (error) {
      console.error('❌ ConsultationAuditDashboard: Erro ao buscar logs:', error);
      toast.error('Erro inesperado ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchLogo();
  }, [typeFilter, statusFilter, dateFromFilter, dateToFilter]);

  const fetchLogo = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'company_logo_url')
        .maybeSingle();
      
      if (data?.value) {
        const logoPath = Array.isArray(data.value) ? data.value[0] : data.value;
        if (typeof logoPath === 'string') {
          setLogoUrl(`https://smytdnkylauxocqrkchn.supabase.co/storage/v1/object/public/system-assets/${logoPath}`);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar logo:', error);
    }
  };

  // Filtrar logs localmente por termo de busca e usuário
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.searched_data.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = userFilter === 'all' || log.user_name === userFilter;
    
    return matchesSearch && matchesUser;
  });

  // Obter lista única de usuários para o filtro
  const uniqueUsers = Array.from(new Set(logs.map(log => log.user_name))).sort();

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setUserFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        Sucesso
      </Badge>
    ) : (
      <Badge variant="destructive">
        Erro
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      CPF: 'bg-blue-100 text-blue-800 border-blue-300',
      CNPJ: 'bg-purple-100 text-purple-800 border-purple-300',
      CEP: 'bg-orange-100 text-orange-800 border-orange-300'
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  const exportToPDF = async () => {
    try {
      // Criar PDF usando jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Configurar fontes
      pdf.setFont('helvetica', 'bold');
      
      let yPosition = 30;
      
      // Adicionar logo se disponível
      if (logoUrl) {
        try {
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(logoBlob);
            });
            
            const imageFormat = logoBlob.type.includes('png') ? 'PNG' : 
                               logoBlob.type.includes('jpeg') || logoBlob.type.includes('jpg') ? 'JPEG' : 'PNG';
            
            pdf.addImage(logoBase64, imageFormat, 20, 10, 30, 30);
          }
          
          pdf.setFontSize(18);
          pdf.text('RELATÓRIO DE AUDITORIA LGPD', 60, 20);
          yPosition = 50;
        } catch (logoError) {
          console.error('Erro ao carregar logo:', logoError);
          pdf.setFontSize(18);
          pdf.text('RELATÓRIO DE AUDITORIA LGPD', 20, 20);
          yPosition = 30;
        }
      } else {
        pdf.setFontSize(18);
        pdf.text('RELATÓRIO DE AUDITORIA LGPD', 20, 20);
        yPosition = 30;
      }
      
      // Adicionar informações do relatório
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const today = new Date();
      pdf.text(`Data de geração: ${format(today, 'dd/MM/yyyy HH:mm')}`, 20, yPosition + 5);
      pdf.text(`Total de logs: ${filteredLogs.length}`, 20, yPosition + 15);
      pdf.text(`Consultas com sucesso: ${filteredLogs.filter(log => log.success).length}`, 20, yPosition + 25);
      pdf.text(`Consultas com erro: ${filteredLogs.filter(log => !log.success).length}`, 20, yPosition + 35);
      
      yPosition += 60;

      // Dados do relatório
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('LOGS DE AUDITORIA', 20, yPosition);
      yPosition += 15;

      // Tabela com os dados usando autoTable
      const tableData = filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
        log.user_name,
        log.consultation_type,
        log.searched_data,
        log.success ? 'Sucesso' : 'Erro',
        log.error_message || 'N/A'
      ]);
      
      autoTable(pdf, {
        head: [['Data/Hora', 'Usuário', 'Tipo', 'Dados', 'Status', 'Erro']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 15 },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 },
          5: { cellWidth: 50 }
        },
        margin: { left: 20, right: 20 },
      });
      
      // Salvar PDF
      const fileName = `relatorio-auditoria-lgpd-${format(today, 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast.success('Relatório PDF gerado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    }
  };

  const openDetailModal = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  console.log('🎯 ConsultationAuditDashboard: Renderizando componente, logs:', logs.length);

  return (
    <div className="space-y-6">
      {/* Informações de Status */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Status da Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800">Total de Logs</h3>
              <p className="text-2xl font-bold text-blue-600">{filteredLogs.length}</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800">Consultas com Sucesso</h3>
              <p className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(log => log.success).length}
              </p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">Consultas com Erro</h3>
              <p className="text-2xl font-bold text-red-600">
                {filteredLogs.filter(log => !log.success).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dashboard de Logs */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Logs de Auditoria LGPD
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowFilters(!showFilters)} 
                  variant="outline" 
                  size="sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button onClick={exportToPDF} variant="outline" size="sm" disabled={filteredLogs.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {/* Painel de Filtros */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Busca */}
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Buscar por dados ou usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Filtro por Tipo */}
                <div className="space-y-2">
                  <Label>Tipo de Consulta</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="CEP">CEP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro por Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro por Usuário */}
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {uniqueUsers.map(user => (
                        <SelectItem key={user} value={user}>{user}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Data Inicial */}
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Data Inicial</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                  />
                </div>
                
                {/* Data Final */}
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Data Final</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Botão para limpar filtros */}
              <div className="mt-4 flex justify-between items-center">
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Limpar Filtros
                </Button>
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredLogs.length} de {logs.length} logs
                </p>
              </div>
            </div>
          )}
          
          {/* Tabela Simplificada */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dados</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Carregando logs de auditoria...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <p className="font-medium">Nenhum log encontrado</p>
                        <p className="text-sm">Realize algumas consultas (CPF, CNPJ, CEP) para gerar dados de auditoria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.user_name}</TableCell>
                      <TableCell>{getTypeBadge(log.consultation_type)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.searched_data}</TableCell>
                      <TableCell>{getStatusBadge(log.success)}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => openDetailModal(log)}
                          variant="outline"
                          size="sm"
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
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Consulta de Auditoria
            </DialogTitle>
            <DialogDescription>
              Informações completas do log de auditoria LGPD
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">DATA E HORA</h3>
                  <p className="font-mono">{format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">USUÁRIO</h3>
                  <p>{selectedLog.user_name}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">TIPO DE CONSULTA</h3>
                  <div>{getTypeBadge(selectedLog.consultation_type)}</div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">STATUS</h3>
                  <div>{getStatusBadge(selectedLog.success)}</div>
                </div>
              </div>
              
              {/* Dados Consultados */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">DADOS CONSULTADOS</h3>
                <p className="font-mono bg-muted p-3 rounded">{selectedLog.searched_data}</p>
              </div>
              
              {/* Informações Técnicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">ENDEREÇO IP</h3>
                  <p className="font-mono">{selectedLog.ip_address ? String(selectedLog.ip_address) : 'Não disponível'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">ID DO USUÁRIO</h3>
                  <p className="font-mono text-xs">{selectedLog.user_id || 'Não disponível'}</p>
                </div>
              </div>
              
              {/* User Agent */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">USER AGENT</h3>
                <p className="font-mono text-xs bg-muted p-3 rounded break-all">
                  {selectedLog.user_agent || 'Não disponível'}
                </p>
              </div>
              
              {/* Mensagem de Erro */}
              {selectedLog.error_message && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">MENSAGEM DE ERRO</h3>
                  <p className="bg-red-50 border border-red-200 p-3 rounded text-red-800">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}
              
              {/* Resultado da Consulta */}
              {selectedLog.search_result && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">RESULTADO DA CONSULTA</h3>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.search_result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}