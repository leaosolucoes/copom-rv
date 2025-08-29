import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { format } from "date-fns";

interface Imprevisto {
  id: string;
  escala_id: string;
  descricao_imprevisto: string;
  created_at: string;
  admin_ciente: boolean;
  admin_ciente_em: string | null;
  escalas_viaturas: {
    viaturas: { prefixo: string } | null;
  } | null;
}

export const ImprevistosMotoristaCard = () => {
  const [imprevistos, setImprevistos] = useState<Imprevisto[]>([]);
  const [loading, setLoading] = useState(true);
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
          descricao_imprevisto,
          created_at,
          admin_ciente,
          admin_ciente_em
        `)
        .eq('motorista_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Buscar informações da viatura para cada imprevisto
      const imprevistosWithDetails = await Promise.all(
        (data || []).map(async (imprevisto) => {
          const escalaResult = await supabase
            .from('escalas_viaturas')
            .select('viatura_id')
            .eq('id', imprevisto.escala_id)
            .single();

          if (escalaResult.data) {
            const viaturaResult = await supabase
              .from('viaturas')
              .select('prefixo')
              .eq('id', escalaResult.data.viatura_id)
              .single();

            return {
              ...imprevisto,
              escalas_viaturas: {
                viaturas: viaturaResult.data
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
                className="border rounded-lg p-3 space-y-2"
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
                    {format(new Date(imprevisto.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                  {imprevisto.admin_ciente && imprevisto.admin_ciente_em && (
                    <span>
                      Ciente em {format(new Date(imprevisto.admin_ciente_em), 'dd/MM HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};