import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudiencias } from '@/hooks/useAudiencias';
import { CriarOficioAudiencia } from './CriarOficioAudiencia';
import { ListaAudiencias } from './ListaAudiencias';
import { DetalhesAudienciaModal } from './DetalhesAudienciaModal';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle
} from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export const AudienciasDashboard = () => {
  const { profile } = useSupabaseAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAudiencia, setSelectedAudiencia] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const { 
    audiencias, 
    audienciasHoje, 
    audienciasPendentes, 
    audienciasAssinadas,
    isLoading 
  } = useAudiencias();

  // Cards de estatísticas
  const stats = [
    {
      title: 'Total de Audiências',
      value: audiencias?.length || 0,
      icon: FileText,
      color: 'text-primary'
    },
    {
      title: 'Audiências Hoje',
      value: audienciasHoje?.length || 0,
      icon: Calendar,
      color: 'text-info'
    },
    {
      title: 'Pendentes',
      value: audienciasPendentes?.length || 0,
      icon: Clock,
      color: 'text-warning'
    },
    {
      title: 'Assinadas',
      value: audienciasAssinadas?.length || 0,
      icon: CheckCircle,
      color: 'text-success'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com título e ações */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Audiências</h1>
          <p className="text-muted-foreground">
            Gerenciamento de ofícios de audiência judicial
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ofício
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs com diferentes visualizações */}
      <Tabs defaultValue="todas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todas">
            Todas
            {audiencias && audiencias.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {audiencias.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hoje">
            Hoje
            {audienciasHoje && audienciasHoje.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {audienciasHoje.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pendentes">
            Pendentes
            {audienciasPendentes && audienciasPendentes.length > 0 && (
              <Badge variant="outline" className="ml-2 text-warning border-warning">
                {audienciasPendentes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assinadas">
            Assinadas
            {audienciasAssinadas && audienciasAssinadas.length > 0 && (
              <Badge variant="outline" className="ml-2 text-success border-success">
                {audienciasAssinadas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <ListaAudiencias />
        </TabsContent>

        <TabsContent value="hoje">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Audiências de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!audienciasHoje || audienciasHoje.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma audiência agendada para hoje</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {audienciasHoje.map((audiencia) => (
                    <div key={audiencia.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{audiencia.numero_processo}</h3>
                          <p className="text-sm text-muted-foreground">{audiencia.vara}</p>
                          <p className="text-sm">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {audiencia.horario_audiencia}
                          </p>
                        </div>
                        <Badge variant={audiencia.eh_presencial ? "default" : "secondary"}>
                          {audiencia.eh_presencial ? 'Presencial' : 'Videoconferência'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Audiências Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!audienciasPendentes || audienciasPendentes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Todas as audiências estão assinadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {audienciasPendentes.map((audiencia) => (
                    <div 
                      key={audiencia.id} 
                      className="border rounded-lg p-4 border-warning/20 cursor-pointer hover:bg-warning/5 transition-colors"
                      onClick={() => {
                        setSelectedAudiencia(audiencia);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{audiencia.numero_processo}</h3>
                          <p className="text-sm text-muted-foreground">{audiencia.vara}</p>
                          <p className="text-sm">
                            Usuário: {audiencia.user.full_name}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-warning border-warning">
                          Pendente
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assinadas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Audiências Assinadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!audienciasAssinadas || audienciasAssinadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma audiência assinada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {audienciasAssinadas.map((audiencia) => (
                    <div key={audiencia.id} className="border rounded-lg p-4 border-success/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{audiencia.numero_processo}</h3>
                          <p className="text-sm text-muted-foreground">{audiencia.vara}</p>
                          <p className="text-sm">
                            Assinado em: {audiencia.data_assinatura ? 
                              new Date(audiencia.data_assinatura).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-success border-success">
                          Assinado
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de criar ofício */}
      <CriarOficioAudiencia
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUserId={profile?.id || ''}
      />

      {/* Modal de detalhes da audiência */}
      <DetalhesAudienciaModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        audiencia={selectedAudiencia}
      />
    </div>
  );
};