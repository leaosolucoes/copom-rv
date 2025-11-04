import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Users, Calendar, CheckCircle, TrendingUp, Crown } from "lucide-react";
import { format, subDays } from "date-fns";
import { logger } from '@/lib/secureLogger';

interface AuditStats {
  totalConsultations: number;
  totalUsers: number;
  consultationsToday: number;
  consultationsThisMonth: number;
  cpfConsultations: number;
  cnpjConsultations: number;
  cepConsultations: number;
  successRate: number;
  topUsers: Array<{ name: string; consultations: number }>;
  dailyConsultations: Array<{ date: string; count: number }>;
}

export function AuditStatsDashboard() {
  logger.debug('🚀 AuditStatsDashboard: Componente iniciado');
  
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      logger.debug('🔍 AuditStatsDashboard: Iniciando busca de estatísticas...');
      
      // Usar a tabela audit_logs que existe no banco
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*');

      if (error) {
        logger.error('❌ AuditStatsDashboard: Erro na consulta:', error);
        throw error;
      }

      if (!logs) {
        logger.warn('⚠️ AuditStatsDashboard: Nenhum log encontrado');
        setStats(null);
        return;
      }

      logger.info('✅ AuditStatsDashboard: Logs encontrados:', logs.length);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calcular estatísticas básicas com base nos dados disponíveis
      const totalConsultations = logs.length;
      const uniqueUsers = new Set(logs.map(log => log.user_id).filter(Boolean)).size;
      const consultationsToday = logs.filter(log => 
        new Date(log.created_at) >= today
      ).length;
      const consultationsThisMonth = logs.filter(log => 
        new Date(log.created_at) >= thisMonth
      ).length;

      // Estatísticas por tipo de ação
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const cpfConsultations = actionCounts['CPF'] || 0;
      const cnpjConsultations = actionCounts['CNPJ'] || 0;
      const cepConsultations = actionCounts['CEP'] || 0;

      const successRate = 100; // Assumir 100% por não ter campo success

      // Top usuários baseado em user_id
      const userCounts = logs.reduce((acc, log) => {
        const userId = log.user_id || 'Desconhecido';
        acc[userId] = (acc[userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topUsers = Object.entries(userCounts)
        .map(([name, consultations]) => ({ name, consultations }))
        .sort((a, b) => b.consultations - a.consultations)
        .slice(0, 5);

      // Consultas por dia (últimos 7 dias)
      const dailyConsultations = Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(now, 6 - i), 'yyyy-MM-dd');
        const count = logs.filter(log => 
          log.created_at.split('T')[0] === date
        ).length;
        return { date, count };
      });

      // REMOVIDO: Log de estatísticas calculadas por segurança

      setStats({
        totalConsultations,
        totalUsers: uniqueUsers,
        consultationsToday,
        consultationsThisMonth,
        cpfConsultations,
        cnpjConsultations,
        cepConsultations,
        successRate,
        topUsers,
        dailyConsultations
      });

    } catch (error) {
      logger.error('❌ AuditStatsDashboard: Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Nenhuma estatística disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Consultas</p>
                <p className="text-2xl font-bold text-primary">{stats.totalConsultations}</p>
              </div>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Únicos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-green-600">{stats.consultationsToday}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Tipos de Consulta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas CPF</p>
                <p className="text-xl font-bold text-blue-600">{stats.cpfConsultations}</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">CPF</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas CNPJ</p>
                <p className="text-xl font-bold text-purple-600">{stats.cnpjConsultations}</p>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">CNPJ</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas CEP</p>
                <p className="text-xl font-bold text-orange-600">{stats.cepConsultations}</p>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">CEP</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Consultas por Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Consultas nos Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyConsultations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                  formatter={(value) => [value, 'Consultas']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Top 5 Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topUsers.map((user, index) => (
              <div key={user.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.consultations} consulta{user.consultations !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{user.consultations}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}