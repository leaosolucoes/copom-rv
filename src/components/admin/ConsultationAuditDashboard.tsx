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

  console.log('🎯 ConsultationAuditDashboard: Renderizando componente');
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🛡️ Auditoria de Consultas LGPD - TESTE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800">Status do Sistema</h3>
              <p className="text-blue-600">
                Componente de auditoria carregado com sucesso!
              </p>
              <p className="text-sm text-blue-500 mt-2">
                Loading: {loading ? 'Sim' : 'Não'} | Logs: {logs.length}
              </p>
            </div>
            
            <Button onClick={fetchLogs} className="w-full">
              Testar Busca de Logs
            </Button>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando dados de auditoria...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="font-medium">Logs encontrados: {logs.length}</h4>
                {logs.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <p className="text-green-800">✅ Dados carregados com sucesso!</p>
                    <p className="text-sm text-green-600">
                      Primeiro log: {logs[0]?.user_name} - {logs[0]?.consultation_type}
                    </p>
                  </div>
                )}
                {logs.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <p className="text-yellow-800">⚠️ Nenhum log encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}