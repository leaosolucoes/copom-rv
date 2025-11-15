import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  created_at: string;
}

interface EndpointStats {
  endpoint: string;
  count: number;
  successRate: number;
}

interface TimeSeriesData {
  time: string;
  requests: number;
  errors: number;
}

export const ApiAnalyticsDashboard = () => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    successRate: 0,
    errorRate: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    fetchLogs();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchLogs, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_api_logs', {
        limit_count: 1000
      });

      if (error) throw error;

      setLogs(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs da API:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ApiLog[]) => {
    if (data.length === 0) {
      setStats({
        totalRequests: 0,
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
      });
      return;
    }

    const successfulRequests = data.filter(log => log.status_code >= 200 && log.status_code < 300).length;
    const errorRequests = data.filter(log => log.status_code >= 400).length;

    setStats({
      totalRequests: data.length,
      successRate: Math.round((successfulRequests / data.length) * 100),
      errorRate: Math.round((errorRequests / data.length) * 100),
      avgResponseTime: 0, // Pode ser calculado se tivermos dados de tempo
    });
  };

  const getTopEndpoints = (): EndpointStats[] => {
    const endpointMap = new Map<string, { total: number; success: number }>();

    logs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      const current = endpointMap.get(key) || { total: 0, success: 0 };
      current.total++;
      if (log.status_code >= 200 && log.status_code < 300) {
        current.success++;
      }
      endpointMap.set(key, current);
    });

    return Array.from(endpointMap.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        count: data.total,
        successRate: Math.round((data.success / data.total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getTimeSeriesData = (): TimeSeriesData[] => {
    const timeMap = new Map<string, { requests: number; errors: number }>();

    logs.forEach(log => {
      const hour = format(new Date(log.created_at), 'HH:00', { locale: ptBR });
      const current = timeMap.get(hour) || { requests: 0, errors: 0 };
      current.requests++;
      if (log.status_code >= 400) {
        current.errors++;
      }
      timeMap.set(hour, current);
    });

    return Array.from(timeMap.entries())
      .map(([time, data]) => ({
        time,
        requests: data.requests,
        errors: data.errors,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getStatusCodeDistribution = () => {
    const statusMap = new Map<string, number>();

    logs.forEach(log => {
      const statusRange = `${Math.floor(log.status_code / 100)}xx`;
      statusMap.set(statusRange, (statusMap.get(statusRange) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const COLORS = {
    '2xx': '#22c55e',
    '3xx': '#3b82f6',
    '4xx': '#f59e0b',
    '5xx': '#ef4444',
  };

  const topEndpoints = getTopEndpoints();
  const timeSeriesData = getTimeSeriesData();
  const statusDistribution = getStatusCodeDistribution();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando análises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 1000 requisições
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Requisições bem-sucedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              Requisições com erro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Endpoints Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topEndpoints.length}</div>
            <p className="text-xs text-muted-foreground">
              Diferentes endpoints
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Endpoints Mais Usados */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoints Mais Utilizados</CardTitle>
            <CardDescription>Top 10 endpoints por volume de requisições</CardDescription>
          </CardHeader>
          <CardContent>
            {topEndpoints.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEndpoints} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="endpoint" 
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Status Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status Codes</CardTitle>
            <CardDescription>Proporção de respostas por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volume ao Longo do Tempo */}
      <Card>
        <CardHeader>
          <CardTitle>Volume de Requisições ao Longo do Tempo</CardTitle>
          <CardDescription>Requisições totais vs erros por hora</CardDescription>
        </CardHeader>
        <CardContent>
          {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="hsl(var(--primary))" 
                  name="Total de Requisições"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="errors" 
                  stroke="#ef4444" 
                  name="Erros"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhes dos Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada dos Endpoints</CardTitle>
          <CardDescription>Estatísticas por endpoint com taxa de sucesso</CardDescription>
        </CardHeader>
        <CardContent>
          {topEndpoints.length > 0 ? (
            <div className="space-y-4">
              {topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{endpoint.endpoint}</p>
                    <p className="text-xs text-muted-foreground">
                      {endpoint.count} requisições
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {endpoint.successRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                    </div>
                    {endpoint.successRate >= 90 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : endpoint.successRate >= 70 ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum endpoint encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
