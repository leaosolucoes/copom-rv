import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface Complaint {
  id: string;
  occurrence_type: string;
  created_at: string;
}

interface SeasonalityAnalysisProps {
  complaints: Complaint[];
}

interface DayPattern {
  day: string;
  dayNum: number;
  count: number;
  percentage: number;
  topTypes: string[];
}

interface HourPattern {
  hour: string;
  count: number;
  percentage: number;
}

interface TypePattern {
  type: string;
  peakDay: string;
  peakHour: string;
  count: number;
}

export const SeasonalityAnalysis = ({ complaints }: SeasonalityAnalysisProps) => {
  const analysis = useMemo(() => {
    if (complaints.length === 0) return null;

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    // Análise por dia da semana
    const dayCount: Map<number, number> = new Map();
    const dayTypes: Map<number, Map<string, number>> = new Map();
    
    // Análise por hora
    const hourCount: Map<number, number> = new Map();
    
    // Análise por tipo
    const typeByDay: Map<string, Map<number, number>> = new Map();
    const typeByHour: Map<string, Map<number, number>> = new Map();

    complaints.forEach(complaint => {
      const date = new Date(complaint.created_at);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const type = complaint.occurrence_type;

      // Contagem por dia
      dayCount.set(dayOfWeek, (dayCount.get(dayOfWeek) || 0) + 1);
      
      // Tipos por dia
      if (!dayTypes.has(dayOfWeek)) {
        dayTypes.set(dayOfWeek, new Map());
      }
      const dayTypeMap = dayTypes.get(dayOfWeek)!;
      dayTypeMap.set(type, (dayTypeMap.get(type) || 0) + 1);

      // Contagem por hora
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1);

      // Tipo por dia
      if (!typeByDay.has(type)) {
        typeByDay.set(type, new Map());
      }
      const typeDayMap = typeByDay.get(type)!;
      typeDayMap.set(dayOfWeek, (typeDayMap.get(dayOfWeek) || 0) + 1);

      // Tipo por hora
      if (!typeByHour.has(type)) {
        typeByHour.set(type, new Map());
      }
      const typeHourMap = typeByHour.get(type)!;
      typeHourMap.set(hour, (typeHourMap.get(hour) || 0) + 1);
    });

    // Padrões por dia
    const dayPatterns: DayPattern[] = Array.from({ length: 7 }, (_, i) => {
      const count = dayCount.get(i) || 0;
      const types = dayTypes.get(i);
      const topTypes = types
        ? Array.from(types.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type]) => type)
        : [];

      return {
        day: dayNames[i],
        dayNum: i,
        count,
        percentage: Math.round((count / complaints.length) * 100),
        topTypes,
      };
    });

    // Padrões por hora
    const hourPatterns: HourPattern[] = Array.from({ length: 24 }, (_, i) => {
      const count = hourCount.get(i) || 0;
      return {
        hour: `${i.toString().padStart(2, '0')}:00`,
        count,
        percentage: Math.round((count / complaints.length) * 100),
      };
    });

    // Padrões por tipo de ocorrência
    const typePatterns: TypePattern[] = [];
    typeByDay.forEach((dayMap, type) => {
      const [peakDay] = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0] || [0, 0];
      
      const hourMap = typeByHour.get(type)!;
      const [peakHour] = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0] || [0, 0];
      
      const count = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);

      typePatterns.push({
        type,
        peakDay: dayNames[peakDay],
        peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
        count,
      });
    });

    typePatterns.sort((a, b) => b.count - a.count);

    // Identificar dia mais crítico
    const criticalDay = dayPatterns.reduce((max, day) => day.count > max.count ? day : max);
    
    // Identificar horário mais crítico
    const criticalHour = hourPatterns.reduce((max, hour) => hour.count > max.count ? hour : max);

    // Identificar padrões de fim de semana vs semana
    const weekdayCount = [1, 2, 3, 4, 5].reduce((sum, day) => sum + (dayCount.get(day) || 0), 0);
    const weekendCount = [0, 6].reduce((sum, day) => sum + (dayCount.get(day) || 0), 0);
    const weekdayAvg = weekdayCount / 5;
    const weekendAvg = weekendCount / 2;

    // Identificar horários comerciais vs não comerciais
    const businessHours = Array.from({ length: 9 }, (_, i) => i + 8); // 8h-17h
    const businessCount = businessHours.reduce((sum, hour) => sum + (hourCount.get(hour) || 0), 0);
    const nonBusinessCount = complaints.length - businessCount;

    return {
      dayPatterns,
      hourPatterns,
      typePatterns: typePatterns.slice(0, 5),
      criticalDay,
      criticalHour,
      weekdayAvg: Math.round(weekdayAvg),
      weekendAvg: Math.round(weekendAvg),
      businessPercentage: Math.round((businessCount / complaints.length) * 100),
      nonBusinessPercentage: Math.round((nonBusinessCount / complaints.length) * 100),
    };
  }, [complaints]);

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Análise de Sazonalidade
          </CardTitle>
          <CardDescription>
            Dados insuficientes para análise de padrões temporais.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { dayPatterns, hourPatterns, typePatterns, criticalDay, criticalHour, weekdayAvg, weekendAvg, businessPercentage } = analysis;

  // Cores para o gráfico de barras por dia
  const getDayColor = (count: number, maxCount: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.8) return 'hsl(var(--destructive))';
    if (intensity > 0.6) return 'hsl(var(--chart-1))';
    if (intensity > 0.4) return 'hsl(var(--chart-3))';
    return 'hsl(var(--chart-4))';
  };

  const maxDayCount = Math.max(...dayPatterns.map(d => d.count));
  const maxHourCount = Math.max(...hourPatterns.map(h => h.count));

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dia Mais Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{criticalDay.day}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalDay.count} denúncias ({criticalDay.percentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Horário Pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{criticalHour.hour}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalHour.count} denúncias ({criticalHour.percentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Dias Úteis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{weekdayAvg}</div>
            <p className="text-xs text-muted-foreground mt-1">
              denúncias por dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Horário Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{businessPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              das denúncias (8h-17h)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico por Dia da Semana */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Distribuição por Dia da Semana
          </CardTitle>
          <CardDescription>
            Volume de denúncias registradas em cada dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayPatterns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DayPattern;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.day}</p>
                        <p className="text-sm">Denúncias: {data.count}</p>
                        <p className="text-sm">Percentual: {data.percentage}%</p>
                        {data.topTypes.length > 0 && (
                          <>
                            <p className="text-xs text-muted-foreground mt-2">Principais tipos:</p>
                            {data.topTypes.map((type, i) => (
                              <p key={i} className="text-xs">• {type}</p>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {dayPatterns.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getDayColor(entry.count, maxDayCount)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {weekdayAvg > weekendAvg * 1.3 && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  <strong>Padrão Identificado:</strong> Dias úteis apresentam {Math.round((weekdayAvg / weekendAvg - 1) * 100)}% mais denúncias que finais de semana.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico por Horário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Distribuição por Horário
          </CardTitle>
          <CardDescription>
            Volume de denúncias ao longo das 24 horas do dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourPatterns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" interval={2} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                {hourPatterns.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.count === maxHourCount ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Horário Comercial (8h-17h)</p>
              <p className="text-lg font-semibold">{businessPercentage}%</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Período Noturno (18h-23h)</p>
              <p className="text-lg font-semibold">
                {Math.round(hourPatterns.slice(18, 24).reduce((s, h) => s + h.count, 0) / complaints.length * 100)}%
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Madrugada (0h-7h)</p>
              <p className="text-lg font-semibold">
                {Math.round(hourPatterns.slice(0, 8).reduce((s, h) => s + h.count, 0) / complaints.length * 100)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Padrões por Tipo de Ocorrência */}
      <Card>
        <CardHeader>
          <CardTitle>Padrões por Tipo de Ocorrência</CardTitle>
          <CardDescription>
            Dia e horário de pico para cada tipo de denúncia (Top 5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {typePatterns.map((pattern, idx) => (
              <div key={idx} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{pattern.type}</h4>
                  <Badge variant="outline">{pattern.count} denúncias</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Dia de pico:</span>
                    <p className="font-medium">{pattern.peakDay}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horário de pico:</span>
                    <p className="font-medium">{pattern.peakHour}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Insights e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="font-semibold text-blue-700 mb-1">📊 Padrão Semanal</p>
            <p className="text-blue-600">
              {weekdayAvg > weekendAvg 
                ? `Recomenda-se aumentar o efetivo nos dias úteis, especialmente ${criticalDay.day}.`
                : 'Distribuição uniforme entre dias úteis e finais de semana.'}
            </p>
          </div>

          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="font-semibold text-orange-700 mb-1">⏰ Padrão Horário</p>
            <p className="text-orange-600">
              Pico de denúncias às {criticalHour.hour}. Considere alocar mais recursos neste horário.
            </p>
          </div>

          {businessPercentage > 70 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="font-semibold text-green-700 mb-1">💼 Horário Comercial</p>
              <p className="text-green-600">
                {businessPercentage}% das denúncias ocorrem em horário comercial. Equipes diurnas são essenciais.
              </p>
            </div>
          )}

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="font-semibold text-purple-700 mb-1">🎯 Tipos Prioritários</p>
            <p className="text-purple-600">
              Principais tipos: {typePatterns.slice(0, 3).map(t => t.type).join(', ')}. 
              Focar recursos nessas categorias pode ter maior impacto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
