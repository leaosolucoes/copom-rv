import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RefreshCw, Download, Filter, Search } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from "date-fns";
import { toast } from "sonner";

interface AccessLog {
  id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  login_success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  geolocation: any;
  failure_reason: string | null;
  created_at: string;
}

export function AccessAuditDashboard() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      console.log('🔍 AccessAuditDashboard: Iniciando busca de logs...');
      
      let query = supabase
        .from('access_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('login_success', statusFilter === 'success');
      }
      
      if (dateFromFilter) {
        query = query.gte('created_at', dateFromFilter + 'T00:00:00.000Z');
      }
      
      if (dateToFilter) {
        query = query.lte('created_at', dateToFilter + 'T23:59:59.999Z');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro na consulta de logs:', error);
        toast.error(`Erro ao carregar logs: ${error.message}`);
        return;
      }
      
      setLogs(data || []);
      
      if (data && data.length > 0) {
        toast.success(`${data.length} logs carregados com sucesso!`);
      } else {
        toast.info('Nenhum log de acesso encontrado');
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar logs:', error);
      toast.error('Erro inesperado ao carregar logs de acesso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, dateFromFilter, dateToFilter]);

  // Filtrar logs localmente por termo de busca
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
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
        Falhou
      </Badge>
    );
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('RELATÓRIO DE AUDITORIA DE ACESSOS', 20, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const today = new Date();
      pdf.text(`Data de geração: ${format(today, 'dd/MM/yyyy HH:mm')}`, 20, 35);
      pdf.text(`Total de logs: ${filteredLogs.length}`, 20, 45);
      pdf.text(`Acessos com sucesso: ${filteredLogs.filter(log => log.login_success).length}`, 20, 55);
      pdf.text(`Acessos com falha: ${filteredLogs.filter(log => !log.login_success).length}`, 20, 65);
      
      const tableData = filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
        log.user_name,
        log.user_email,
        log.user_role,
        log.login_success ? 'Sucesso' : 'Falhou',
        log.ip_address || 'N/A'
      ]);
      
      autoTable(pdf, {
        head: [['Data/Hora', 'Nome', 'Email', 'Perfil', 'Status', 'IP']],
        body: tableData,
        startY: 80,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
      });
      
      const fileName = `relatorio-acessos-${format(today, 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast.success('Relatório PDF gerado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Acessos</CardTitle>
          <CardDescription>
            Monitoramento de logs de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredLogs.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Acessos com Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {filteredLogs.filter(log => log.login_success).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Acessos com Falha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(log => !log.login_success).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={filteredLogs.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>

            {showFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="failure">Falha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpar Filtros
                </Button>
              </Card>
            )}
          </div>

          {/* Tabela */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Motivo Falha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{log.user_name}</TableCell>
                      <TableCell>{log.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.user_role}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.login_success)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.failure_reason || '-'}
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
