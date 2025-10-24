import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, Clock, MessageSquare, Smartphone, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface StatisticsData {
  totalComplaints: number;
  complaintsToday: number;
  complaintsThisMonth: number;
  dailyAverage: number;
  statusBreakdown: Array<{ name: string; value: number; color: string }>;
  deviceBreakdown: Array<{ name: string; value: number; percentage: string }>;
  topOccurrenceTypes: Array<{ type: string; count: number }>;
  topNeighborhoods: Array<{ neighborhood: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
  whatsappStats: { sent: number; total: number; rate: string };
}

const STATUS_COLORS: Record<string, string> = {
  'nova': '#ef4444',
  'cadastrada': '#f59e0b',
  'finalizada': '#10b981',
  'a_verificar': '#3b82f6',
  'verificado': '#8b5cf6',
  'fiscal_solicitado': '#ec4899'
};

const STATUS_LABELS: Record<string, string> = {
  'nova': 'Nova',
  'cadastrada': 'Cadastrada',
  'finalizada': 'Finalizada',
  'a_verificar': 'A Verificar',
  'verificado': 'Verificado',
  'fiscal_solicitado': 'Fiscal Solicitado'
};

const DEVICE_LABELS: Record<string, string> = {
  'api': 'API',
  'mobile': 'Mobile',
  'desktop': 'Desktop',
  'phone': 'Registro feito por ligação telefônica',
  'not_informed': 'Não informado'
};

export function ComplaintsStatisticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [period, setPeriod] = useState<string>("30");
  const { toast } = useToast();

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Query: Buscar TODAS as denúncias
      const { data: complaints, error } = await supabase
        .from('complaints')
        .select('status, user_device_type, whatsapp_sent, created_at, occurrence_type, occurrence_neighborhood');

      if (error) throw error;

      if (!complaints) {
        setStatistics(null);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodDays = parseInt(period);
      const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Calcular totais
      const totalComplaints = complaints.length;
      const complaintsToday = complaints.filter(c => new Date(c.created_at) >= today).length;
      const complaintsThisMonth = complaints.filter(c => new Date(c.created_at) >= thisMonthStart).length;
      const dailyAverage = Math.round((complaintsThisMonth / now.getDate()) * 10) / 10;

      // Status breakdown
      const statusCounts: Record<string, number> = {};
      complaints.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      });
      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#6b7280'
      }));

      // Device breakdown
      const deviceCounts: Record<string, number> = {
        not_informed: 0,
        api: 0,
        mobile: 0,
        desktop: 0,
        phone: 0
      };
      complaints.forEach(c => {
        const device = c.user_device_type || 'not_informed';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const deviceBreakdown = Object.entries(deviceCounts)
        .filter(([_, count]) => count > 0)
        .map(([device, count]) => ({
          name: DEVICE_LABELS[device] || device,
          value: count,
          percentage: ((count / totalComplaints) * 100).toFixed(1) + '%'
        }));

      // Top occurrence types
      const typeCounts: Record<string, number> = {};
      complaints.forEach(c => {
        if (c.occurrence_type) {
          typeCounts[c.occurrence_type] = (typeCounts[c.occurrence_type] || 0) + 1;
        }
      });
      const topOccurrenceTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top neighborhoods
      const neighborhoodCounts: Record<string, number> = {};
      complaints.forEach(c => {
        if (c.occurrence_neighborhood) {
          neighborhoodCounts[c.occurrence_neighborhood] = (neighborhoodCounts[c.occurrence_neighborhood] || 0) + 1;
        }
      });
      const topNeighborhoods = Object.entries(neighborhoodCounts)
        .map(([neighborhood, count]) => ({ neighborhood, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Daily trend (período selecionado)
      const dailyCounts: Record<string, number> = {};
      complaints
        .filter(c => new Date(c.created_at) >= periodStart)
        .forEach(c => {
          const date = new Date(c.created_at).toISOString().split('T')[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });
      const dailyTrend = Object.entries(dailyCounts)
        .map(([date, count]) => ({ 
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
          count 
        }))
        .sort((a, b) => {
          const [dayA, monthA] = a.date.split('/').map(Number);
          const [dayB, monthB] = b.date.split('/').map(Number);
          return monthA !== monthB ? monthA - monthB : dayA - dayB;
        });

      // Hourly distribution
      const hourlyCounts: Record<number, number> = {};
      complaints.forEach(c => {
        const hour = new Date(c.created_at).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
      });
      const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}h`,
        count: hourlyCounts[i] || 0
      }));

      // WhatsApp stats
      const whatsappSent = complaints.filter(c => c.whatsapp_sent).length;
      const whatsappStats = {
        sent: whatsappSent,
        total: totalComplaints,
        rate: ((whatsappSent / totalComplaints) * 100).toFixed(1) + '%'
      };

      setStatistics({
        totalComplaints,
        complaintsToday,
        complaintsThisMonth,
        dailyAverage,
        statusBreakdown,
        deviceBreakdown,
        topOccurrenceTypes,
        topNeighborhoods,
        dailyTrend,
        hourlyDistribution,
        whatsappStats
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas das denúncias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhuma estatística disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Estatísticas Gerais</h2>
          <p className="text-muted-foreground">Análise completa de todas as denúncias do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStatistics}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Denúncias</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalComplaints.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">Todas as denúncias do sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Denúncias Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.complaintsToday}</div>
            <p className="text-xs text-muted-foreground">Registradas hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.complaintsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.dailyAverage}</div>
            <p className="text-xs text-muted-foreground">Por dia (mês atual)</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Distribuição */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Total de denúncias por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statistics.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statistics.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Dispositivo</CardTitle>
            <CardDescription>Origem das denúncias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-semibold">Todos</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{statistics.totalComplaints}</div>
                  <div className="text-xs text-muted-foreground">100%</div>
                </div>
              </div>
              {statistics.deviceBreakdown.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded">
                  <span className="text-sm">{device.name}</span>
                  <div className="text-right">
                    <div className="font-semibold">{device.value}</div>
                    <div className="text-xs text-muted-foreground">{device.percentage}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Rankings */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Tipos de Ocorrência</CardTitle>
            <CardDescription>Tipos mais reportados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={statistics.topOccurrenceTypes} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={200} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Bairros</CardTitle>
            <CardDescription>Bairros com mais denúncias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={statistics.topNeighborhoods} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="neighborhood" type="category" width={200} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Temporal</CardTitle>
          <CardDescription>Denúncias registradas no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={statistics.dailyTrend} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#10b981" name="Denúncias" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Horário */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Hora do Dia</CardTitle>
          <CardDescription>Horários de pico de denúncias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={statistics.hourlyDistribution} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Enviados</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.whatsappStats.sent}</div>
            <p className="text-xs text-muted-foreground">
              Taxa de envio: {statistics.whatsappStats.rate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tipos Únicos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.topOccurrenceTypes.length}</div>
            <p className="text-xs text-muted-foreground">Tipos de ocorrência diferentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bairros Atendidos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.topNeighborhoods.length}</div>
            <p className="text-xs text-muted-foreground">Bairros com denúncias</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
