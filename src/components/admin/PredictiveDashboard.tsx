import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Complaint {
  id: string;
  user_location?: {
    latitude: number;
    longitude: number;
  };
  occurrence_type: string;
  created_at: string;
}

interface PredictiveDashboardProps {
  complaints: Complaint[];
}

interface RegionPrediction {
  region: string;
  center: { lat: number; lng: number };
  historical: number[];
  predicted: number[];
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  avgPerWeek: number;
  topTypes: string[];
}

const CLUSTER_RADIUS = 0.02; // ~2km em graus

export const PredictiveDashboard = ({ complaints }: PredictiveDashboardProps) => {
  const predictions = useMemo(() => {
    const complaintsWithLocation = complaints.filter(
      c => c.user_location?.latitude && c.user_location?.longitude
    );

    if (complaintsWithLocation.length < 10) return [];

    // Agrupar por região
    const regions: Map<string, Complaint[]> = new Map();
    
    complaintsWithLocation.forEach(complaint => {
      const lat = complaint.user_location!.latitude;
      const lng = complaint.user_location!.longitude;
      
      let foundRegion = false;
      for (const [key, regionComplaints] of regions.entries()) {
        const [centerLat, centerLng] = key.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2)
        );
        
        if (distance < CLUSTER_RADIUS) {
          regionComplaints.push(complaint);
          foundRegion = true;
          break;
        }
      }
      
      if (!foundRegion) {
        regions.set(`${lat},${lng}`, [complaint]);
      }
    });

    // Calcular previsões para cada região
    const regionPredictions: RegionPrediction[] = [];

    regions.forEach((regionComplaints, key) => {
      if (regionComplaints.length < 5) return;

      const [centerLat, centerLng] = key.split(',').map(Number);
      
      // Agrupar por semana
      const weeklyData: Map<string, number> = new Map();
      regionComplaints.forEach(c => {
        const date = new Date(c.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1);
      });

      const weeks = Array.from(weeklyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8); // Últimas 8 semanas

      if (weeks.length < 4) return;

      const historical = weeks.map(([_, count]) => count);
      
      // Calcular tendência linear simples
      const n = historical.length;
      const xMean = (n - 1) / 2;
      const yMean = historical.reduce((a, b) => a + b, 0) / n;
      
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (historical[i] - yMean);
        denominator += Math.pow(i - xMean, 2);
      }
      
      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;
      
      // Prever próximas 4 semanas
      const predicted = [1, 2, 3, 4].map(i => {
        const value = Math.max(0, Math.round(slope * (n - 1 + i) + intercept));
        return value;
      });

      // Calcular confiança baseado em R²
      const yPred = historical.map((_, i) => slope * i + intercept);
      const ssRes = historical.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0);
      const ssTot = historical.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
      const confidence = Math.max(0, Math.min(100, rSquared * 100));

      // Determinar tendência
      const recentAvg = historical.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const olderAvg = historical.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const trend = recentAvg > olderAvg * 1.2 ? 'up' : recentAvg < olderAvg * 0.8 ? 'down' : 'stable';

      // Top tipos de ocorrência
      const typeCounts: Map<string, number> = new Map();
      regionComplaints.forEach(c => {
        typeCounts.set(c.occurrence_type, (typeCounts.get(c.occurrence_type) || 0) + 1);
      });
      const topTypes = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      regionPredictions.push({
        region: `Região ${regionPredictions.length + 1}`,
        center: { lat: centerLat, lng: centerLng },
        historical,
        predicted,
        trend,
        confidence: Math.round(confidence),
        avgPerWeek: Math.round(historical.reduce((a, b) => a + b, 0) / historical.length),
        topTypes,
      });
    });

    return regionPredictions.sort((a, b) => b.avgPerWeek - a.avgPerWeek).slice(0, 5);
  }, [complaints]);

  // Dados para gráfico de linha temporal
  const timelineData = useMemo(() => {
    if (predictions.length === 0) return [];

    const maxLength = Math.max(...predictions.map(p => p.historical.length + p.predicted.length));
    const data: any[] = [];

    for (let i = 0; i < maxLength; i++) {
      const point: any = { week: i < 8 ? `Sem -${8 - i}` : `Sem +${i - 7}` };
      
      predictions.forEach((pred, idx) => {
        if (i < pred.historical.length) {
          point[`Região ${idx + 1}`] = pred.historical[i];
        } else if (i < pred.historical.length + pred.predicted.length) {
          point[`Região ${idx + 1} (Prev)`] = pred.predicted[i - pred.historical.length];
        }
      });
      
      data.push(point);
    }

    return data;
  }, [predictions]);

  // Dados para gráfico de barras de previsão total
  const summaryData = useMemo(() => {
    return predictions.map(pred => ({
      region: pred.region,
      'Média Histórica': pred.avgPerWeek,
      'Previsão (4 sem)': Math.round(pred.predicted.reduce((a, b) => a + b, 0) / 4),
    }));
  }, [predictions]);

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dashboard Preditivo
          </CardTitle>
          <CardDescription>
            Dados insuficientes para análise preditiva. São necessárias pelo menos 10 denúncias com localização.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalPredicted = predictions.reduce((sum, p) => sum + p.predicted.reduce((a, b) => a + b, 0), 0);
  const totalHistorical = predictions.reduce((sum, p) => sum + p.historical.reduce((a, b) => a + b, 0), 0);
  const avgConfidence = Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length);

  return (
    <div className="space-y-6">
      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Previsão (4 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPredicted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              denúncias estimadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Histórico (8 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHistorical}</div>
            <p className="text-xs text-muted-foreground mt-1">
              denúncias registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confiança Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              das previsões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Regiões Analisadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              áreas monitoradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução e Previsão Temporal</CardTitle>
          <CardDescription>
            Histórico das últimas 8 semanas e projeção para as próximas 4 semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              {predictions.map((_, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={`Região ${idx + 1}`}
                  stroke={`hsl(${(idx * 360) / predictions.length}, 70%, 50%)`}
                  strokeWidth={2}
                />
              ))}
              {predictions.map((_, idx) => (
                <Line
                  key={`prev-${idx}`}
                  type="monotone"
                  dataKey={`Região ${idx + 1} (Prev)`}
                  stroke={`hsl(${(idx * 360) / predictions.length}, 70%, 50%)`}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Barras Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação: Histórico vs Previsão</CardTitle>
          <CardDescription>
            Média semanal histórica comparada com previsão média para as próximas 4 semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summaryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Média Histórica" fill="hsl(var(--primary))" />
              <Bar dataKey="Previsão (4 sem)" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalhes por Região */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {predictions.map((pred, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{pred.region}</CardTitle>
                <Badge variant={pred.trend === 'up' ? 'destructive' : pred.trend === 'down' ? 'default' : 'secondary'}>
                  {pred.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {pred.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                  {pred.trend === 'stable' && <Activity className="h-3 w-3 mr-1" />}
                  {pred.trend === 'up' ? 'Crescimento' : pred.trend === 'down' ? 'Redução' : 'Estável'}
                </Badge>
              </div>
              <CardDescription>
                Coordenadas: {pred.center.lat.toFixed(4)}, {pred.center.lng.toFixed(4)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Média Semanal</p>
                  <p className="text-lg font-semibold">{pred.avgPerWeek} denúncias</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Previsão 4 semanas</p>
                  <p className="text-lg font-semibold">
                    {pred.predicted.reduce((a, b) => a + b, 0)} denúncias
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Confiança da Previsão</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${pred.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{pred.confidence}%</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Principais Tipos de Ocorrência</p>
                <div className="flex flex-wrap gap-1">
                  {pred.topTypes.map((type, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {pred.trend === 'up' && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    <strong>Alerta:</strong> Esta região apresenta tendência de crescimento. Recomenda-se aumento no monitoramento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações Metodológicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Metodologia de Previsão
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Análise Temporal:</strong> Baseada nas últimas 8 semanas de dados históricos
          </p>
          <p>
            • <strong>Agrupamento Geográfico:</strong> Denúncias agrupadas em regiões com raio de ~2km
          </p>
          <p>
            • <strong>Modelo:</strong> Regressão linear simples para projeção de tendências
          </p>
          <p>
            • <strong>Confiança:</strong> Calculada através do coeficiente de determinação (R²)
          </p>
          <p>
            • <strong>Atualização:</strong> As previsões são recalculadas automaticamente com novos dados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
