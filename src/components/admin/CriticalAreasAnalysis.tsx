import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, MapPin } from 'lucide-react';

interface Complaint {
  id: string;
  protocol_number: string;
  occurrence_type: string;
  user_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
}

interface CriticalAreasAnalysisProps {
  complaints: Complaint[];
}

interface AreaCluster {
  center: { lat: number; lng: number };
  complaints: Complaint[];
  radius: number;
}

export const CriticalAreasAnalysis = ({ complaints }: CriticalAreasAnalysisProps) => {
  const criticalAreas = useMemo(() => {
    // Filtrar denúncias com localização
    const withLocation = complaints.filter(
      (c) => c.user_location?.latitude && c.user_location?.longitude
    );

    if (withLocation.length === 0) return [];

    // Agrupar denúncias próximas (raio de ~500m = 0.0045 graus)
    const CLUSTER_RADIUS = 0.0045;
    const clusters: AreaCluster[] = [];

    withLocation.forEach((complaint) => {
      const lat = complaint.user_location!.latitude;
      const lng = complaint.user_location!.longitude;

      // Verificar se pertence a um cluster existente
      let foundCluster = false;
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(cluster.center.lat - lat, 2) + 
          Math.pow(cluster.center.lng - lng, 2)
        );

        if (distance <= CLUSTER_RADIUS) {
          cluster.complaints.push(complaint);
          // Recalcular centro do cluster
          const avgLat = cluster.complaints.reduce((sum, c) => sum + c.user_location!.latitude, 0) / cluster.complaints.length;
          const avgLng = cluster.complaints.reduce((sum, c) => sum + c.user_location!.longitude, 0) / cluster.complaints.length;
          cluster.center = { lat: avgLat, lng: avgLng };
          foundCluster = true;
          break;
        }
      }

      // Criar novo cluster se não encontrou um existente
      if (!foundCluster) {
        clusters.push({
          center: { lat, lng },
          complaints: [complaint],
          radius: CLUSTER_RADIUS,
        });
      }
    });

    // Ordenar por número de denúncias (decrescente)
    return clusters
      .sort((a, b) => b.complaints.length - a.complaints.length)
      .slice(0, 5); // Top 5 áreas críticas
  }, [complaints]);

  const getOccurrenceTypes = (areaComplaints: Complaint[]) => {
    const types = areaComplaints.reduce((acc, c) => {
      acc[c.occurrence_type] = (acc[c.occurrence_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  const getSeverityLevel = (count: number): { color: string; label: string } => {
    if (count >= 10) return { color: 'bg-red-500', label: 'CRÍTICA' };
    if (count >= 5) return { color: 'bg-orange-500', label: 'ALTA' };
    if (count >= 3) return { color: 'bg-yellow-500', label: 'MÉDIA' };
    return { color: 'bg-blue-500', label: 'BAIXA' };
  };

  if (criticalAreas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Análise de Áreas Críticas
          </CardTitle>
          <CardDescription>
            Nenhuma área crítica identificada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Quando houver múltiplas denúncias em áreas próximas, elas aparecerão aqui para análise.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Análise de Áreas Críticas
        </CardTitle>
        <CardDescription>
          Top {criticalAreas.length} regiões com maior concentração de denúncias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalAreas.map((area, index) => {
          const severity = getSeverityLevel(area.complaints.length);
          const topTypes = getOccurrenceTypes(area.complaints);

          return (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`${severity.color} text-white`}>
                      #{index + 1} - {severity.label}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {area.complaints.length} denúncias
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      Lat: {area.center.lat.toFixed(5)}, Lng: {area.center.lng.toFixed(5)}
                    </span>
                  </div>
                </div>
                <TrendingUp className={`h-5 w-5 ${severity.color.replace('bg-', 'text-')}`} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tipos de ocorrência mais comuns:</p>
                <div className="space-y-1">
                  {topTypes.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{type}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Raio aproximado:</strong> ~500 metros
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Recomendação:</strong>{' '}
                  {area.complaints.length >= 10
                    ? 'Atenção imediata! Esta área requer uma operação especial.'
                    : area.complaints.length >= 5
                    ? 'Considere intensificar a fiscalização nesta região.'
                    : 'Monitorar periodicamente para evitar agravamento.'}
                </p>
              </div>
            </div>
          );
        })}

        {/* Resumo geral */}
        <div className="pt-4 border-t">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              📊 Resumo da Análise
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total de áreas críticas</p>
                <p className="text-lg font-bold">{criticalAreas.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Denúncias em áreas críticas</p>
                <p className="text-lg font-bold">
                  {criticalAreas.reduce((sum, area) => sum + area.complaints.length, 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              * Áreas críticas são regiões com 3+ denúncias em um raio de ~500m
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
