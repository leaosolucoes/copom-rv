import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";
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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      console.log('🔍 ConsultationAuditDashboard: Iniciando busca de logs...');
      
      const { data, error } = await supabase
        .from('consultation_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

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
  }, []);

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
              <p className="text-2xl font-bold text-blue-600">{logs.length}</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800">Consultas com Sucesso</h3>
              <p className="text-2xl font-bold text-green-600">
                {logs.filter(log => log.success).length}
              </p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">Consultas com Erro</h3>
              <p className="text-2xl font-bold text-red-600">
                {logs.filter(log => !log.success).length}
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
            <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Carregando logs de auditoria...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <p className="font-medium">Nenhum log encontrado</p>
                        <p className="text-sm">Realize algumas consultas (CPF, CNPJ, CEP) para gerar dados de auditoria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.user_name}</TableCell>
                      <TableCell>{getTypeBadge(log.consultation_type)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.searched_data}</TableCell>
                      <TableCell>{getStatusBadge(log.success)}</TableCell>
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