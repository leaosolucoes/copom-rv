import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  duration_ms: number;
  timestamp: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
}

interface AggregatedMetric {
  name: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export const PerformanceMonitorDashboard = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgPageLoad: 0,
    avgApiResponse: 0,
    totalRequests: 0,
    errorRate: 0,
  });

  useEffect(() => {
    fetchMetrics();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchMetrics, 30000);
    
    // Subscrever para atualizações em tempo real
    const channel = supabase
      .channel('performance-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'performance_metrics',
        },
        (payload) => {
          setMetrics((prev) => [payload.new as PerformanceMetric, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      // Buscar métricas das últimas 24 horas
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', twentyFourHoursAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      setMetrics(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PerformanceMetric[]) => {
    if (data.length === 0) {
      setStats({
        avgPageLoad: 0,
        avgApiResponse: 0,
        totalRequests: 0,
        errorRate: 0,
      });
      return;
    }

    const pageLoads = data.filter((m) => m.metric_type === 'page_load');
    const apiCalls = data.filter(
      (m) => m.metric_type === 'api_response' || m.metric_type === 'supabase_query'
    );
    const errors = data.filter((m) => !m.success);

    setStats({
      avgPageLoad:
        pageLoads.length > 0
          ? Math.round(pageLoads.reduce((sum, m) => sum + m.duration_ms, 0) / pageLoads.length)
          : 0,
      avgApiResponse:
        apiCalls.length > 0
          ? Math.round(apiCalls.reduce((sum, m) => sum + m.duration_ms, 0) / apiCalls.length)
          : 0,
      totalRequests: data.length,
      errorRate: data.length > 0 ? Math.round((errors.length / data.length) * 100) : 0,
    });
  };

  const getChartData = () => {
    // Agrupar por hora
    const grouped = metrics.reduce((acc, metric) => {
      const hour = format(new Date(metric.timestamp), 'HH:00', { locale: ptBR });
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          pageLoad: [],
          apiResponse: [],
        };
      }
      
      if (metric.metric_type === 'page_load') {
        acc[hour].pageLoad.push(metric.duration_ms);
      } else {
        acc[hour].apiResponse.push(metric.duration_ms);
      }
      
      return acc;
    }, {} as Record<string, { hour: string; pageLoad: number[]; apiResponse: number[] }>);

    return Object.values(grouped)
      .map((group) => ({
        hora: group.hour,
        'Carregamento de Página':
          group.pageLoad.length > 0
            ? Math.round(group.pageLoad.reduce((a, b) => a + b, 0) / group.pageLoad.length)
            : 0,
        'Resposta da API':
          group.apiResponse.length > 0
            ? Math.round(group.apiResponse.reduce((a, b) => a + b, 0) / group.apiResponse.length)
            : 0,
      }))
      .reverse()
      .slice(-12); // Últimas 12 horas
  };

  const getTopSlowEndpoints = (): AggregatedMetric[] => {
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.metric_name]) {
        acc[metric.metric_name] = [];
      }
      acc[metric.metric_name].push(metric.duration_ms);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped)
      .map(([name, durations]) => ({
        name,
        avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Activity className="h-6 w-6 animate-spin" />
          <span className="ml-2">Carregando métricas...</span>
        </div>
      </Card>
    );
  }

  const chartData = getChartData();
  const topSlowEndpoints = getTopSlowEndpoints();

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Carregamento Médio</p>
              <p className="text-2xl font-bold">{stats.avgPageLoad}ms</p>
            </div>
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">API Média</p>
              <p className="text-2xl font-bold">{stats.avgApiResponse}ms</p>
            </div>
            <Activity className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Requisições</p>
              <p className="text-2xl font-bold">{stats.totalRequests}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Erro</p>
              <p className="text-2xl font-bold">{stats.errorRate}%</p>
            </div>
            <AlertCircle
              className={`h-8 w-8 ${stats.errorRate > 5 ? 'text-destructive' : 'text-primary'}`}
            />
          </div>
        </Card>
      </div>

      {/* Gráfico de Linha - Performance ao Longo do Tempo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance ao Longo do Tempo (últimas 12 horas)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis label={{ value: 'Tempo (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Carregamento de Página"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Resposta da API"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top 5 Endpoints Mais Lentos */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Top 5 Endpoints Mais Lentos
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topSlowEndpoints} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Tempo Médio (ms)', position: 'bottom' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const data = payload[0].payload as AggregatedMetric;
                return (
                  <div className="bg-background border rounded p-2 shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">Média: {data.avg}ms</p>
                    <p className="text-sm">Mín: {data.min}ms</p>
                    <p className="text-sm">Máx: {data.max}ms</p>
                    <p className="text-sm">Chamadas: {data.count}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="avg" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
