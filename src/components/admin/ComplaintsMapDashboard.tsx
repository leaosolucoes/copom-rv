import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComplaintsMap } from './ComplaintsMap';
import { CriticalAreasAnalysis } from './CriticalAreasAnalysis';
import { TemporalFilters } from './TemporalFilters';
import { PredictiveDashboard } from './PredictiveDashboard';
import { SeasonalityAnalysis } from './SeasonalityAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, RefreshCw, TrendingUp, AlertCircle, CheckCircle, Archive, ArrowUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Complaint {
  id: string;
  protocol_number: string;
  complainant_name: string;
  occurrence_type: string;
  status: string;
  user_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  attendant_id?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

export const ComplaintsMapDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [comparisonComplaints, setComparisonComplaints] = useState<Complaint[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    nova: 0,
    em_andamento: 0,
    processada: 0,
    arquivada: 0,
    with_location: 0,
  });

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      
      console.log('🗺️ MAP: Iniciando busca de denúncias...');
      
      // Query principal
      let query = supabase
        .from('complaints')
        .select('id, protocol_number, complainant_name, occurrence_type, status, user_location, created_at, attendant_id')
        .not('status', 'eq', 'arquivada')
        .order('created_at', { ascending: false });

      // Aplicar filtro de data se existir
      if (dateRange) {
        console.log('🗺️ MAP: Aplicando filtro de data:', dateRange);
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      console.log('🗺️ MAP: Resultado da query:', { 
        dataLength: data?.length, 
        error: error?.message,
        errorDetails: error 
      });

      if (error) {
        console.error('🗺️ MAP: Erro na query:', error);
        throw error;
      }

      // Converter user_location de Json para o tipo esperado
      const processedData = (data || []).map((complaint: any) => ({
        ...complaint,
        user_location: complaint.user_location as { latitude: number; longitude: number } | undefined,
      }));

      console.log('🗺️ MAP: Denúncias processadas:', processedData.length);
      setComplaints(processedData);

      // Query de comparação se existir
      if (comparisonRange) {
        console.log('🗺️ MAP: Buscando denúncias de comparação...');
        let comparisonQuery = supabase
          .from('complaints')
          .select('id, protocol_number, complainant_name, occurrence_type, status, user_location, created_at, attendant_id')
          .not('status', 'eq', 'arquivada')
          .gte('created_at', comparisonRange.from.toISOString())
          .lte('created_at', comparisonRange.to.toISOString())
          .order('created_at', { ascending: false });

        const { data: compData, error: compError } = await comparisonQuery;

        if (compError) {
          console.error('🗺️ MAP: Erro na query de comparação:', compError);
          throw compError;
        }

        const processedCompData = (compData || []).map((complaint: any) => ({
          ...complaint,
          user_location: complaint.user_location as { latitude: number; longitude: number } | undefined,
        }));

        setComparisonComplaints(processedCompData);
      } else {
        setComparisonComplaints([]);
      }

      // Calcular estatísticas
      const withLocation = data?.filter((c: any) => c.user_location?.latitude && c.user_location?.longitude).length || 0;
      const nova = data?.filter((c: any) => c.status === 'nova').length || 0;
      const em_andamento = data?.filter((c: any) => c.status === 'em_andamento').length || 0;
      const processada = data?.filter((c: any) => c.status === 'processada').length || 0;
      const arquivada = data?.filter((c: any) => c.status === 'arquivada').length || 0;

      console.log('🗺️ MAP: Estatísticas calculadas:', {
        total: data?.length || 0,
        nova,
        em_andamento,
        processada,
        arquivada,
        with_location: withLocation,
      });

      setStats({
        total: data?.length || 0,
        nova,
        em_andamento,
        processada,
        arquivada,
        with_location: withLocation,
      });
      
      console.log('🗺️ MAP: Busca concluída com sucesso!');
    } catch (error) {
      console.error('🗺️ MAP: ERRO CRÍTICO ao buscar denúncias:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível carregar as denúncias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();

    // Supabase Realtime
    const channel = supabase
      .channel('complaints-map-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange, comparisonRange]);

  return (
    <div className="space-y-6">
      {/* Filtros Temporais */}
      <TemporalFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparisonRange={comparisonRange}
        onComparisonRangeChange={setComparisonRange}
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.total}</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{stats.nova}</span>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{stats.em_andamento}</span>
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{stats.processada}</span>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com Localização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">{stats.with_location}</span>
              <MapPin className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.with_location / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mapa de Denúncias em Tempo Real
              </CardTitle>
              <CardDescription>
                Visualização geográfica das denúncias ativas com status e informações
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchComplaints}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Carregando denúncias...</p>
              </div>
            </div>
          ) : (
            <>
              <ComplaintsMap complaints={complaints} />
              
              {stats.with_location === 0 && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-yellow-700">Nenhuma denúncia com localização</h4>
                      <p className="text-sm text-yellow-600 mt-1">
                        As denúncias precisam ter informações de localização (GPS) para aparecer no mapa.
                        As localizações são capturadas automaticamente quando o denunciante permite o acesso à localização.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Preditivo */}
      <PredictiveDashboard complaints={complaints} />

      {/* Análise de Sazonalidade */}
      <SeasonalityAnalysis complaints={complaints} />

      {/* Informações adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CriticalAreasAnalysis 
          complaints={complaints}
          comparisonComplaints={comparisonRange ? comparisonComplaints : undefined}
          dateRange={dateRange}
          comparisonRange={comparisonRange}
        />
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sobre o Mapa e Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Visualização de Marcadores:</p>
            <p>
              • <strong>Clique nos marcadores</strong> para ver detalhes da denúncia
            </p>
            <p>
              • <strong>Cores</strong> indicam status (azul: nova, laranja: em andamento, verde: processada)
            </p>
            
            <p className="font-semibold text-foreground pt-2">Heatmap de Densidade:</p>
            <p>
              • <strong>Cores quentes</strong> (vermelho/laranja) indicam alta concentração de denúncias
            </p>
            <p>
              • <strong>Cores frias</strong> (azul/verde) indicam baixa concentração
            </p>
            <p>
              • <strong>Ajuste a intensidade</strong> e raio para melhor visualização
            </p>
            
            <p className="font-semibold text-foreground pt-2">Análise de Áreas Críticas:</p>
            <p>
              • Identifica automaticamente regiões com 3+ denúncias em raio de ~500m
            </p>
            <p>
              • Mostra tipos de ocorrência mais comuns por área
            </p>
            <p>
              • Prioriza áreas por severidade (crítica, alta, média, baixa)
            </p>
            
            <p className="font-semibold text-foreground pt-2">Filtros Temporais:</p>
            <p>
              • Filtre denúncias por períodos específicos
            </p>
            <p>
              • Compare dois períodos diferentes para analisar evolução
            </p>
            <p>
              • Identifique tendências e padrões ao longo do tempo
            </p>
            
            <p className="font-semibold text-foreground pt-2">Dashboard Preditivo:</p>
            <p>
              • Previsões baseadas em análise de regressão linear dos dados históricos
            </p>
            <p>
              • Projeções para as próximas 4 semanas por região
            </p>
            <p>
              • Indicadores de tendência e confiança das estimativas
            </p>
            
            <p className="pt-2">
              • <strong>Atualização automática</strong> em tempo real quando há alterações
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
