import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Car, User, Phone, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatarDataBrasilComTimezone } from "@/utils/dataBrasil";
import { DetalhesImprevisto } from "./DetalhesImprevisto";

interface Escala {
  id: string;
  viatura_id: string;
  motorista_id: string;
  fiscal_ids: string[];
  data_servico: string;
  hora_entrada: string;
  hora_saida: string;
  km_inicial: number;
  km_final: number | null;
  celular_funcional: string | null;
  status: 'ativa' | 'encerrada' | 'cancelada';
  created_at: string;
  encerrado_em: string | null;
  observacoes: string | null;
  viaturas: { prefixo: string; modelo: string; placa: string } | null;
  motorista: { full_name: string } | null;
  fiscal: { full_name: string }[] | null;
}

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

export const EscalasManagement = () => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [imprevistos, setImprevistos] = useState<Imprevisto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImprevisto, setSelectedImprevisto] = useState<Imprevisto | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
    fetchImprevistos();
  }, []);

  const fetchEscalas = async () => {
    try {
      const { data, error } = await supabase
        .from('escalas_viaturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch related data separately
      const escalasWithDetails = await Promise.all(
        (data || []).map(async (escala) => {
          const [viaturaResult, motoristaResult, fiscalResult] = await Promise.all([
            supabase.from('viaturas').select('prefixo, modelo, placa').eq('id', escala.viatura_id).single(),
            supabase.from('users').select('full_name').eq('id', escala.motorista_id).single(),
            escala.fiscal_ids && escala.fiscal_ids.length > 0 ? 
              supabase.from('users').select('full_name').in('id', escala.fiscal_ids) : 
              Promise.resolve({ data: [] })
          ]);

          return {
            ...escala,
            viaturas: viaturaResult.data,
            motorista: motoristaResult.data,
            fiscal: fiscalResult.data
          };
        })
      );

      setEscalas(escalasWithDetails);
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar escalas",
        variant: "destructive",
      });
    }
  };

  const fetchImprevistos = async () => {
    try {
      const { data, error } = await supabase
        .from('escala_imprevistos')
        .select('*, admin_ciente, admin_ciente_por, admin_ciente_em')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch related data separately
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
      toast({
        title: "Erro",
        description: "Erro ao carregar imprevistos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativa':
        return <Badge className="bg-success text-success-foreground">Ativa</Badge>;
      case 'encerrada':
        return <Badge variant="secondary">Encerrada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleViewImprevisto = (imprevisto: Imprevisto) => {
    setSelectedImprevisto(imprevisto);
    setShowDetalhesModal(true);
  };

  const filteredEscalas = escalas.filter((escala) =>
    escala.viaturas?.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    escala.motorista?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (escala.fiscal && escala.fiscal.some(f => 
      f.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p>Carregando escalas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciamento de Escalas</h2>
        <Input
          placeholder="Buscar por viatura, motorista ou fiscal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escalas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {escalas.filter(e => e.status === 'ativa').length}
            </div>
            <p className="text-sm text-muted-foreground">
              viaturas em serviço
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Imprevistos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {imprevistos.filter(i => {
                const imprevistoBrasil = new Intl.DateTimeFormat('sv-SE', {
                  timeZone: 'America/Sao_Paulo',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).format(new Date(i.created_at));
                const hojeBrasil = new Intl.DateTimeFormat('sv-SE', {
                  timeZone: 'America/Sao_Paulo',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).format(new Date());
                return imprevistoBrasil === hojeBrasil;
              }).length}
            </div>
            <p className="text-sm text-muted-foreground">
              ocorrências relatadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Escalas de Viaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Fiscal</TableHead>
                  <TableHead>Data/Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEscalas.map((escala) => (
                  <TableRow key={escala.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{escala.viaturas?.prefixo}</div>
                          <div className="text-sm text-muted-foreground">
                            {escala.viaturas?.modelo}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{escala.motorista?.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {escala.fiscal && escala.fiscal.length > 0 ? (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-sm">
                            {escala.fiscal.map((f, index) => (
                              <div key={index}>{f.full_name}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Clock className="h-4 w-4 text-muted-foreground" />
                         <div className="text-sm">
                           <div>{formatarDataBrasilComTimezone(new Date(escala.data_servico + 'T12:00:00'))}</div>
                           <div className="text-muted-foreground">
                             {escala.hora_entrada} - {escala.hora_saida}
                           </div>
                           {escala.encerrado_em && (
                             <div className="text-red-600 font-medium">
                               Encerrado: {formatarDataBrasilComTimezone(new Date(escala.encerrado_em)).split(' ')[1] || format(new Date(escala.encerrado_em), 'HH:mm')}
                             </div>
                           )}
                         </div>
                       </div>
                     </TableCell>
                    <TableCell>{getStatusBadge(escala.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Inicial: {escala.km_inicial.toLocaleString()}</div>
                        {escala.km_final && (
                          <div>Final: {escala.km_final.toLocaleString()}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {escala.celular_funcional ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{escala.celular_funcional}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {imprevistos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Imprevistos Relatados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {imprevistos.map((imprevisto) => (
                <div 
                  key={imprevisto.id} 
                  className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleViewImprevisto(imprevisto)}
                >
                   <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center gap-2">
                       <div>
                         <div className="font-medium">
                           Viatura: {imprevisto.escalas_viaturas?.viaturas?.prefixo}
                         </div>
                         <div className="text-sm text-muted-foreground">
                           Motorista: {imprevisto.escalas_viaturas?.users?.full_name}
                         </div>
                       </div>
                       {imprevisto.admin_ciente ? (
                         <Badge className="bg-success text-success-foreground text-xs">
                           Admin Ciente
                         </Badge>
                       ) : (
                         <Badge variant="secondary" className="text-xs">
                           Pendente
                         </Badge>
                       )}
                     </div>
                      <div className="text-sm text-muted-foreground">
                        {new Intl.DateTimeFormat('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(new Date(imprevisto.created_at))}
                      </div>
                   </div>
                  <p className="text-sm">{imprevisto.descricao_imprevisto}</p>
                  {imprevisto.fotos && imprevisto.fotos.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        {imprevisto.fotos.length} foto(s) anexada(s)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DetalhesImprevisto
        open={showDetalhesModal}
        onOpenChange={setShowDetalhesModal}
        imprevisto={selectedImprevisto}
      />
    </div>
  );
};