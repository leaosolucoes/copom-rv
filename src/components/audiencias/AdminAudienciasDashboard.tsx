import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ExternalLink, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalhesAudienciaModal } from "./DetalhesAudienciaModal";

interface Audiencia {
  id: string;
  numero_processo: string;
  vara: string;
  data_audiencia: string;
  horario_audiencia: string;
  status: string;
  arquivo_oficio_url: string;
  link_videoconferencia?: string;
  data_assinatura?: string;
  user_id: string;
  criado_por?: string;
  hash_assinatura?: string;
  dados_assinatura?: any;
  users?: {
    full_name: string;
  } | null;
  criador?: {
    full_name: string;
  } | null;
}

export function AdminAudienciasDashboard() {
  const { profile } = useSupabaseAuth();
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAudiencia, setSelectedAudiencia] = useState<Audiencia | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTodasAudiencias();
  }, [profile?.id]);

  const fetchTodasAudiencias = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('audiencias')
        .select(`
          id,
          numero_processo,
          vara,
          data_audiencia,
          horario_audiencia,
          status,
          arquivo_oficio_url,
          link_videoconferencia,
          data_assinatura,
          user_id,
          criado_por,
          hash_assinatura,
          dados_assinatura,
          users:user_id (
            full_name
          ),
          criador:criado_por (
            full_name
          )
        `)
        .eq('user_id', profile.id)
        .order('data_audiencia', { ascending: true });

      if (error) throw error;
      setAudiencias((data || []) as any);
    } catch (error) {
      console.error('Erro ao buscar audiências do admin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const audienciasHoje = audiencias.filter(a => {
    const hoje = new Date().toISOString().split('T')[0];
    return a.data_audiencia === hoje;
  });

  const oficiosPendentes = audiencias.filter(a => a.status === 'pendente');
  const oficiosAssinados = audiencias.filter(a => a.status === 'assinado');

  const handleDownloadOficio = (url: string, numeroProcesso: string) => {
    window.open(url, '_blank');
  };

  const formatDateTime = (date: string, time: string) => {
    const dateTime = new Date(`${date}T${time}`);
    return {
      date: format(dateTime, 'dd/MM/yyyy', { locale: ptBR }),
      time: format(dateTime, 'HH:mm', { locale: ptBR })
    };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card><CardContent className="p-6">Carregando...</CardContent></Card>
        <Card><CardContent className="p-6">Carregando...</CardContent></Card>
        <Card><CardContent className="p-6">Carregando...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Audiências Judiciais */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Audiências Judiciais
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Audiências de Hoje
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {audienciasHoje.length > 0 ? (
            audienciasHoje.map((audiencia) => {
              const { date, time } = formatDateTime(audiencia.data_audiencia, audiencia.horario_audiencia);
              return (
                <div key={audiencia.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">Processo: {audiencia.numero_processo}</p>
                      <p className="text-xs text-muted-foreground">{date} às {time} - {audiencia.vara}</p>
                      {audiencia.users && (
                        <p className="text-xs text-muted-foreground">Fiscal: {audiencia.users.full_name}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {audiencia.status === 'assinado' ? 'Assinado' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {audiencia.link_videoconferencia && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Videoconferência disponível
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma audiência para hoje</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full flex items-center gap-2 mt-4"
            onClick={() => {}}
          >
            <Clock className="h-4 w-4" />
            Ver Histórico
          </Button>
        </CardContent>
      </Card>

      {/* Ofícios Pendentes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Ofícios Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {oficiosPendentes.length > 0 ? (
            <div className="space-y-3">
              {oficiosPendentes.map((audiencia) => {
                const { date, time } = formatDateTime(audiencia.data_audiencia, audiencia.horario_audiencia);
                return (
                  <div 
                    key={audiencia.id} 
                    className="p-3 border rounded-lg space-y-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedAudiencia(audiencia);
                      setShowModal(true);
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm">Processo: {audiencia.numero_processo}</p>
                      <p className="text-xs text-muted-foreground">{date} às {time} - {audiencia.vara}</p>
                      {audiencia.users && (
                        <p className="text-xs text-muted-foreground">Fiscal: {audiencia.users.full_name}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-center py-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Pendente de Assinatura
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum ofício pendente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ofícios Assinados */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Ofícios Assinados
            {oficiosAssinados.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {oficiosAssinados.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {oficiosAssinados.length > 0 ? (
            <div className="space-y-3">
              {oficiosAssinados.slice(0, 3).map((audiencia) => {
                const { date, time } = formatDateTime(audiencia.data_audiencia, audiencia.horario_audiencia);
                return (
                  <div key={audiencia.id} className="p-3 border rounded-lg bg-green-50 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">Processo: {audiencia.numero_processo}</p>
                        <p className="text-xs text-muted-foreground">{date} às {time} - {audiencia.vara}</p>
                        {audiencia.users && (
                          <p className="text-xs text-muted-foreground">Fiscal: {audiencia.users.full_name}</p>
                        )}
                      </div>
                      <Badge variant="default" className="bg-green-500 text-xs">
                        Assinado
                      </Badge>
                    </div>
                    {audiencia.link_videoconferencia && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Videoconferência disponível
                      </p>
                    )}
                    {audiencia.data_assinatura && (
                      <p className="text-xs text-green-600">
                        Assinado em: {format(new Date(audiencia.data_assinatura), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                );
              })}
              {oficiosAssinados.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  E mais {oficiosAssinados.length - 3} ofícios assinados...
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum ofício assinado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DetalhesAudienciaModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedAudiencia(null);
          // Recarregar dados após fechar modal
          fetchTodasAudiencias();
        }}
        audiencia={selectedAudiencia}
        isFiscal={false} // Admin pode assinar mas não é fiscal
      />
    </div>
  );
}