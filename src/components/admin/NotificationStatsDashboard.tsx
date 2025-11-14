import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Eye, TrendingUp, Users, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NotificationStats {
  totalSent: number;
  totalOpened: number;
  engagementRate: number;
  byDay: { date: string; sent: number; opened: number }[];
  byUser: { userName: string; sent: number; opened: number }[];
  byComplaintType: { type: string; count: number }[];
}

export const NotificationStatsDashboard = () => {
  const [stats, setStats] = useState<NotificationStats>({
    totalSent: 0,
    totalOpened: 0,
    engagementRate: 0,
    byDay: [],
    byUser: [],
    byComplaintType: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7'); // dias

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Buscar todas as notificações do período
      const { data: notifications, error } = await supabase
        .from('notification_history')
        .select('*, users!notification_history_user_id_fkey(full_name), complaints(occurrence_type)')
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: true });

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        setStats({
          totalSent: 0,
          totalOpened: 0,
          engagementRate: 0,
          byDay: [],
          byUser: [],
          byComplaintType: [],
        });
        return;
      }

      // Calcular estatísticas
      const totalSent = notifications.length;
      const totalOpened = notifications.filter(n => n.opened_at).length;
      const engagementRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

      // Agrupar por dia
      const byDayMap = new Map<string, { sent: number; opened: number }>();
      notifications.forEach(n => {
        const date = new Date(n.sent_at).toLocaleDateString('pt-BR');
        const current = byDayMap.get(date) || { sent: 0, opened: 0 };
        current.sent++;
        if (n.opened_at) current.opened++;
        byDayMap.set(date, current);
      });

      const byDay = Array.from(byDayMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      // Agrupar por usuário
      const byUserMap = new Map<string, { sent: number; opened: number }>();
      notifications.forEach(n => {
        const userName = (n.users as any)?.full_name || 'Desconhecido';
        const current = byUserMap.get(userName) || { sent: 0, opened: 0 };
        current.sent++;
        if (n.opened_at) current.opened++;
        byUserMap.set(userName, current);
      });

      const byUser = Array.from(byUserMap.entries())
        .map(([userName, data]) => ({
          userName,
          ...data,
        }))
        .sort((a, b) => b.sent - a.sent)
        .slice(0, 10); // Top 10 usuários

      // Agrupar por tipo de denúncia
      const byTypeMap = new Map<string, number>();
      notifications.forEach(n => {
        const type = (n.complaints as any)?.occurrence_type || 'Outros';
        byTypeMap.set(type, (byTypeMap.get(type) || 0) + 1);
      });

      const byComplaintType = Array.from(byTypeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalSent,
        totalOpened,
        engagementRate,
        byDay,
        byUser,
        byComplaintType,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Notificações</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estatísticas de Notificações Push
              </CardTitle>
              <CardDescription>
                Análise de envio e engajamento de notificações
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchStats} variant="outline" size="sm">
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Enviadas
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              Notificações enviadas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Abertas
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpened}</div>
            <p className="text-xs text-muted-foreground">
              Notificações visualizadas pelos usuários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Engajamento
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.engagementRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Percentual de notificações abertas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Envios e Aberturas por Dia */}
      {stats.byDay.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Envios e Aberturas por Dia</CardTitle>
            <CardDescription>
              Comparativo diário de notificações enviadas vs abertas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#8884d8" 
                  name="Enviadas"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke="#82ca9d" 
                  name="Abertas"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráficos em 2 Colunas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 10 Usuários */}
        {stats.byUser.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 10 Usuários
              </CardTitle>
              <CardDescription>
                Usuários que mais receberam notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.byUser} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="userName" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#8884d8" name="Enviadas" />
                  <Bar dataKey="opened" fill="#82ca9d" name="Abertas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Notificações por Tipo de Denúncia */}
        {stats.byComplaintType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Por Tipo de Denúncia</CardTitle>
              <CardDescription>
                Distribuição de notificações por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.byComplaintType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percent }) => 
                      `${type}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.byComplaintType.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mensagem quando não há dados */}
      {stats.totalSent === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma notificação enviada</p>
              <p className="text-sm">
                Ainda não há estatísticas de notificações para o período selecionado
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
