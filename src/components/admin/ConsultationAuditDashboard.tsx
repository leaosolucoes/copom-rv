import { useState, useEffect } from "react";
import { AuditStatsDashboard } from "./AuditStatsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Eye, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    success: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      console.log('🔍 ConsultationAuditDashboard: Iniciando busca de logs...');
      
      let query = supabase
        .from('consultation_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.search) {
        query = query.or(`user_name.ilike.%${filters.search}%,searched_data.ilike.%${filters.search}%`);
      }
      
      if (filters.type) {
        query = query.eq('consultation_type', filters.type as 'CPF' | 'CNPJ' | 'CEP');
      }
      
      if (filters.success !== '') {
        query = query.eq('success', filters.success === 'true');
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query.limit(1000);

      console.log('🔍 ConsultationAuditDashboard: Resposta da consulta:', { data, error });

      if (error) {
        console.error('❌ ConsultationAuditDashboard: Erro na consulta:', error);
        throw error;
      }
      
      console.log('✅ ConsultationAuditDashboard: Logs encontrados:', data?.length || 0);
      setLogs(data || []);
    } catch (error) {
      console.error('❌ ConsultationAuditDashboard: Erro ao buscar logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Relatório de Auditoria de Consultas', 20, 20);
    
    // Data do relatório
    doc.setFontSize(12);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 30);
    
    // Filtros aplicados
    let yPos = 45;
    doc.setFontSize(10);
    doc.text('Filtros aplicados:', 20, yPos);
    yPos += 10;
    
    if (filters.type) {
      doc.text(`- Tipo: ${filters.type}`, 25, yPos);
      yPos += 8;
    }
    if (filters.success !== '') {
      doc.text(`- Status: ${filters.success === 'true' ? 'Sucesso' : 'Erro'}`, 25, yPos);
      yPos += 8;
    }
    if (filters.startDate || filters.endDate) {
      const dateRange = `${filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Início'} - ${filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Fim'}`;
      doc.text(`- Período: ${dateRange}`, 25, yPos);
      yPos += 8;
    }

    // Tabela
    const tableData = logs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
      log.user_name,
      log.consultation_type,
      log.searched_data,
      log.success ? 'Sucesso' : 'Erro',
      (log.ip_address as string) || 'N/A'
    ]);

    (doc as any).autoTable({
      head: [['Data/Hora', 'Usuário', 'Tipo', 'Dados', 'Status', 'IP']],
      body: tableData,
      startY: yPos + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save(`auditoria-consultas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Relatório PDF gerado com sucesso!');
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
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
      CPF: 'bg-blue-100 text-blue-800',
      CNPJ: 'bg-purple-100 text-purple-800',
      CEP: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors] || ''}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dashboard de Estatísticas */}
      <AuditStatsDashboard />
      
      {/* Dashboard de Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Auditoria de Consultas LGPD
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Input
              placeholder="Buscar por usuário ou dados..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de consulta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="CNPJ">CNPJ</SelectItem>
                <SelectItem value="CEP">CEP</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.success} onValueChange={(value) => setFilters(prev => ({ ...prev, success: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="true">Sucesso</SelectItem>
                <SelectItem value="false">Erro</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Data inicial'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Data final'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ações */}
          <div className="flex gap-2 mb-4">
            <Button onClick={fetchLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dados Pesquisados</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>{getTypeBadge(log.consultation_type)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.searched_data}</TableCell>
                      <TableCell>{getStatusBadge(log.success)}</TableCell>
                      <TableCell className="text-sm">{(log.ip_address as string) || 'N/A'}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Consulta</DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Usuário:</label>
                                    <p className="text-sm">{selectedLog.user_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Tipo:</label>
                                    <p className="text-sm">{selectedLog.consultation_type}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Dados Pesquisados:</label>
                                    <p className="text-sm font-mono">{selectedLog.searched_data}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status:</label>
                                    <p className="text-sm">{selectedLog.success ? 'Sucesso' : 'Erro'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">IP:</label>
                                    <p className="text-sm">{(selectedLog.ip_address as string) || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Data/Hora:</label>
                                    <p className="text-sm">{format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">User Agent:</label>
                                  <p className="text-xs bg-muted p-2 rounded">{selectedLog.user_agent}</p>
                                </div>
                                
                                {selectedLog.error_message && (
                                  <div>
                                    <label className="text-sm font-medium">Mensagem de Erro:</label>
                                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{selectedLog.error_message}</p>
                                  </div>
                                )}
                                
                                {selectedLog.search_result && (
                                  <div>
                                    <label className="text-sm font-medium">Resultado da Consulta:</label>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                      {JSON.stringify(selectedLog.search_result, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}