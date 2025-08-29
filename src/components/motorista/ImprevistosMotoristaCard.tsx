import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { formatInTimeZone } from "date-fns-tz";
import { DetalhesImprevisto } from "@/components/admin/DetalhesImprevisto";

interface Imprevisto {
  id: string;
  escala_id: string;
  motorista_id: string;
  descricao_imprevisto: string;
  fotos: string[] | null;
  created_at: string;
  admin_ciente: boolean;
  admin_ciente_por: string | null;
  admin_ciente_em: string | null;
  escalas_viaturas: {
    viaturas: { prefixo: string } | null;
    users: { full_name: string } | null;
  } | null;
}

export const ImprevistosMotoristaCard = () => {
  const [imprevistos, setImprevistos] = useState<Imprevisto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImprevisto, setSelectedImprevisto] = useState<Imprevisto | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const { profile } = useSupabaseAuth();

  useEffect(() => {
    if (!profile?.id) return;
    
    fetchImprevistos();
  }, [profile?.id]);

  const fetchImprevistos = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('escala_imprevistos')
        .select(`
          id,
          escala_id,
          motorista_id,
          descricao_imprevisto,
          fotos,
          created_at,
          admin_ciente,
          admin_ciente_por,
          admin_ciente_em
        `)
        .eq('motorista_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Buscar informações da viatura e motorista para cada imprevisto
      const imprevistosWithDetails = await Promise.all(
        (data || []).map(async (imprevisto) => {
          const escalaResult = await supabase
            .from('escalas_viaturas')
            .select('viatura_id, motorista_id')
            .eq('id', imprevisto.escala_id)
            .single();

          if (escalaResult.data) {
            const [viaturaResult, motoristaResult] = await Promise.all([
              supabase.from('viaturas').select('prefixo').eq('id', escalaResult.data.viatura_id).single(),
              supabase.from('users').select('full_name').eq('id', escalaResult.data.motorista_id).single()
            ]);

            return {
              ...imprevisto,
              escalas_viaturas: {
                viaturas: viaturaResult.data,
                users: motoristaResult.data
              }
            };
          }

          return {
            ...imprevisto,
            escalas_viaturas: null
          };
        })
      );

      setImprevistos(imprevistosWithDetails);
    } catch (error) {
      console.error('Erro ao buscar imprevistos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewImprevisto = (imprevisto: Imprevisto) => {
    setSelectedImprevisto(imprevisto);
    setShowDetalhesModal(true);
  };

  const imprevistosNaoCientes = imprevistos.filter(i => !i.admin_ciente).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Imprevistos Relatados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Imprevistos Relatados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">
            {imprevistos.length}
          </div>
          {imprevistosNaoCientes > 0 && (
            <Badge variant="destructive">
              {imprevistosNaoCientes} pendente(s)
            </Badge>
          )}
        </div>

        {imprevistos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum imprevisto relatado
          </p>
        ) : (
          <div className="space-y-3">
            {imprevistos.map((imprevisto) => (
              <div 
                key={imprevisto.id} 
                className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleViewImprevisto(imprevisto)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Viatura: {imprevisto.escalas_viaturas?.viaturas?.prefixo || 'N/A'}
                  </div>
                  {imprevisto.admin_ciente ? (
                    <Badge className="bg-success text-success-foreground text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ciente
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {imprevisto.descricao_imprevisto}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatInTimeZone(new Date(imprevisto.created_at), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}
                  </span>
                  {imprevisto.admin_ciente && imprevisto.admin_ciente_em && (
                    <span>
                      Ciente em {formatInTimeZone(new Date(imprevisto.admin_ciente_em), 'America/Sao_Paulo', 'dd/MM HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <DetalhesImprevisto
        open={showDetalhesModal}
        onOpenChange={setShowDetalhesModal}
        imprevisto={selectedImprevisto}
      />
    </Card>
  );
};