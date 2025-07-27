import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Eye, Users, Calendar, TrendingUp, Shield } from "lucide-react";

interface AuditStats {
  totalConsultations: number;
  totalUsers: number;
  consultationsToday: number;
  consultationsThisMonth: number;
  cpfConsultations: number;
  cnpjConsultations: number;
  cepConsultations: number;
  successRate: number;
  topUsers: Array<{
    user_name: string;
    consultation_count: number;
  }>;
  dailyConsultations: Array<{
    date: string;
    count: number;
  }>;
}

export function AuditStatsDashboard() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      console.log('🔍 AuditStatsDashboard: Iniciando busca de estatísticas...');
      
      // Buscar estatísticas principais
      const { data: logs, error } = await supabase
        .from('consultation_audit_logs')
        .select('*');

      console.log('🔍 AuditStatsDashboard: Resposta da consulta:', { logs, error });

      if (error) {
        console.error('❌ AuditStatsDashboard: Erro na consulta:', error);
        throw error;
      }

      if (!logs) {
        console.log('⚠️ AuditStatsDashboard: Nenhum log encontrado');
        setStats(null);
        return;
      }

      console.log('✅ AuditStatsDashboard: Logs encontrados:', logs.length);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calcular estatísticas
      const totalConsultations = logs.length;
      const uniqueUsers = new Set(logs.map(log => log.user_id)).size;
      
      const consultationsToday = logs.filter(log => 
        new Date(log.created_at) >= today
      ).length;
      
      const consultationsThisMonth = logs.filter(log => 
        new Date(log.created_at) >= thisMonth
      ).length;

      const cpfConsultations = logs.filter(log => log.consultation_type === 'CPF').length;
      const cnpjConsultations = logs.filter(log => log.consultation_type === 'CNPJ').length;
      const cepConsultations = logs.filter(log => log.consultation_type === 'CEP').length;

      const successfulConsultations = logs.filter(log => log.success).length;
      const successRate = totalConsultations > 0 ? (successfulConsultations / totalConsultations) * 100 : 0;

      // Top usuários
      const userConsultations = logs.reduce((acc, log) => {
        acc[log.user_name] = (acc[log.user_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topUsers = Object.entries(userConsultations)
        .map(([user_name, consultation_count]) => ({ user_name, consultation_count }))
        .sort((a, b) => b.consultation_count - a.consultation_count)
        .slice(0, 5);

      // Consultas diárias dos últimos 7 dias
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyConsultations = last7Days.map(date => {
        const count = logs.filter(log => 
          log.created_at.split('T')[0] === date
        ).length;
        return { date, count };
      });

      console.log('📊 AuditStatsDashboard: Estatísticas calculadas:', {
        totalConsultations,
        totalUsers: uniqueUsers,
        consultationsToday,
        consultationsThisMonth,
        cpfConsultations,
        cnpjConsultations,
        cepConsultations,
        successRate,
        topUsersCount: topUsers.length
      });

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
      console.error('❌ AuditStatsDashboard: Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum dado de auditoria encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Consultas</p>
                <p className="text-2xl font-bold">{stats.totalConsultations}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas Hoje</p>
                <p className="text-2xl font-bold">{stats.consultationsToday}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Cards de consultas por tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas CPF</p>
                <p className="text-xl font-bold">{stats.cpfConsultations}</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                CPF
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas CNPJ</p>
                <p className="text-xl font-bold">{stats.cnpjConsultations}</p>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                CNPJ
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas CEP</p>
                <p className="text-xl font-bold">{stats.cepConsultations}</p>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                CEP
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top usuários e consultas diárias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 5 Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topUsers.map((user, index) => (
                <div key={user.user_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{user.user_name}</span>
                  </div>
                  <Badge variant="secondary">
                    {user.consultation_count} consultas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Consultas dos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.dailyConsultations.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {new Date(day.date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit' 
                    })}
                  </span>
                  <div className="flex items-center gap-2 flex-1 mx-4">
                    <Progress 
                      value={stats.dailyConsultations.length > 0 ? (day.count / Math.max(...stats.dailyConsultations.map(d => d.count))) * 100 : 0} 
                      className="flex-1" 
                    />
                    <span className="text-sm font-medium w-8 text-right">{day.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Mês Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.consultationsThisMonth}</p>
              <p className="text-sm text-muted-foreground">Consultas no mês</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.consultationsThisMonth > 0 ? Math.round(stats.consultationsThisMonth / new Date().getDate()) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Média diária</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {stats.totalConsultations > 0 ? Math.round((stats.consultationsThisMonth / stats.totalConsultations) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Do total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.consultationsToday}
              </p>
              <p className="text-sm text-muted-foreground">Hoje</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}