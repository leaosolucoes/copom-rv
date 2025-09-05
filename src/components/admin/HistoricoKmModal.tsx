import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Car, Calendar, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoricoKmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Viatura {
  id: string;
  prefixo: string;
  modelo: string;
  placa: string;
  km_atual: number;
}

interface KmData {
  viatura: string;
  km_atual: number;
  total_km_periodo: number;
}

interface ChartData {
  data: string;
  km: number;
}

export const HistoricoKmModal = ({ open, onOpenChange }: HistoricoKmModalProps) => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViatura, setSelectedViatura] = useState<string>('todas');
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return inicioMes.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [kmData, setKmData] = useState<KmData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalKmPeriodo, setTotalKmPeriodo] = useState(0);
  const [registrosPeriodo, setRegistrosPeriodo] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchViaturas();
    }
  }, [open]);

  const fetchViaturas = async () => {
    try {
      const { data, error } = await supabase
        .from('viaturas')
        .select('*')
        .eq('ativa', true)
        .order('prefixo');

      if (error) throw error;
      setViaturas(data || []);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas",
        variant: "destructive"
      });
    }
  };

  const fetchKmData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('checklist_viaturas')
        .select(`
          km_inicial,
          data_checklist,
          viatura_id,
          viaturas (
            prefixo,
            modelo,
            placa,
            km_atual
          )
        `)
        .gte('data_checklist', dataInicio)
        .lte('data_checklist', dataFim)
        .order('data_checklist', { ascending: true });

      if (selectedViatura !== 'todas') {
        query = query.eq('viatura_id', selectedViatura);
      }

      const { data: checklists, error } = await query;

      if (error) throw error;

      console.log('Checklists encontrados:', checklists);

      // Processar dados para a tabela de resumo por viatura
      const viaturaKmMap = new Map<string, KmData>();
      const chartDataMap = new Map<string, number>();
      let totalRegistros = 0;

      checklists?.forEach(checklist => {
        if (!checklist.viaturas) return;
        
        const viaturaId = checklist.viatura_id;
        const prefixo = checklist.viaturas.prefixo;
        const kmAtual = checklist.viaturas.km_atual;
        const kmInicial = checklist.km_inicial;
        
        totalRegistros++;

        // Para o resumo por viatura, acumular km_inicial de todos os registros
        if (viaturaKmMap.has(viaturaId)) {
          const existing = viaturaKmMap.get(viaturaId)!;
          existing.total_km_periodo += kmInicial;
        } else {
          viaturaKmMap.set(viaturaId, {
            viatura: prefixo,
            km_atual: kmAtual,
            total_km_periodo: kmInicial
          });
        }

        // Para o gráfico, mostrar evolução do km_inicial por data
        const dataKey = checklist.data_checklist;
        chartDataMap.set(dataKey, (chartDataMap.get(dataKey) || 0) + kmInicial);
      });

      // Converter para arrays
      const kmDataArray = Array.from(viaturaKmMap.values());
      const chartDataArray = Array.from(chartDataMap.entries())
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([data, km]) => ({
          data: new Date(data).toLocaleDateString('pt-BR'),
          km
        }));

      // Calcular KM total somando todos os km_inicial do período
      const totalKmPeriodo = checklists?.reduce((sum, checklist) => sum + checklist.km_inicial, 0) || 0;

      setKmData(kmDataArray);
      setChartData(chartDataArray);
      setTotalKmPeriodo(totalKmPeriodo);
      setRegistrosPeriodo(totalRegistros);

    } catch (error) {
      console.error('Erro ao buscar dados de KM:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de quilometragem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = () => {
    if (!dataInicio || !dataFim) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha as datas de início e fim",
        variant: "destructive"
      });
      return;
    }

    if (new Date(dataInicio) > new Date(dataFim)) {
      toast({
        title: "Datas inválidas",
        description: "A data de início não pode ser posterior à data de fim",
        variant: "destructive"
      });
      return;
    }

    fetchKmData();
  };

  const viaturasSelecionadas = selectedViatura === 'todas' 
    ? 'Todas as viaturas' 
    : viaturas.find(v => v.id === selectedViatura)?.prefixo || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Histórico de Quilometragem
          </DialogTitle>
          <DialogDescription>
            Consulte o histórico de quilometragem das viaturas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros de Consulta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🔍 Filtros de Consulta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Viatura</Label>
                  <Select value={selectedViatura} onValueChange={setSelectedViatura}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a viatura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as viaturas</SelectItem>
                      {viaturas.map((viatura) => (
                        <SelectItem key={viatura.id} value={viatura.id}>
                          {viatura.prefixo} - {viatura.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleConsultar}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Consultando...' : 'Consultar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">KM Total no Período</p>
                    <p className="text-lg font-bold text-blue-600">
                      {totalKmPeriodo.toLocaleString()} km
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registros no Período</p>
                    <p className="text-lg font-bold text-green-600">{registrosPeriodo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Viatura Selecionada</p>
                    <p className="text-sm font-semibold text-purple-600">
                      {viaturasSelecionadas}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolução */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução da Quilometragem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="data" 
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toLocaleString()} km`, 'KM']}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="km" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela Resumo por Viatura */}
          {kmData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo por Viatura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Viatura</TableHead>
                        <TableHead className="font-semibold">KM Atual</TableHead>
                        <TableHead className="font-semibold">Total KM no Período</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kmData.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-blue-600">
                            {item.viatura}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {item.km_atual.toLocaleString()} km
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {item.total_km_periodo.toLocaleString()} km
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {kmData.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum dado encontrado para o período selecionado.
                <br />
                <span className="text-sm">Clique em "Consultar" para buscar os dados.</span>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};