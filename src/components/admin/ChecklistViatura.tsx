import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Fuel, Droplets, Car, Settings, PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface Viatura {
  id: string;
  prefixo: string;
  placa: string;
  modelo: string;
  km_atual: number;
}

interface EquipamentoChecklist {
  nome: string;
  status: 'ok' | 'defeituoso' | 'nao_tem';
}

const equipamentosDefault = [
  'Extintor',
  'Triângulo',
  'Macaco',
  'Chave de roda',
  'Documentos',
  'Kit primeiros socorros',
  'Rádio comunicador',
  'Sirene',
  'Giroflex',
  'GPS',
  'Combustível reserva',
  'Ferramentas básicas'
];

export const ChecklistViatura = () => {
  const { profile } = useSupabaseAuth();
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViatura, setSelectedViatura] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_checklist: new Date().toISOString().split('T')[0],
    horario_checklist: new Date().toTimeString().slice(0, 5),
    nome_guerra: '',
    km_inicial: 0,
    combustivel_nivel: '',
    oleo_nivel: '',
    data_proxima_troca_oleo: '',
    km_proxima_troca_oleo: 0,
    limpeza_ok: false,
    observacoes_alteracoes: ''
  });
  
  const [pneus, setPneus] = useState({
    dianteiro_direito: 'otimo',
    dianteiro_esquerdo: 'otimo',
    traseiro_direito: 'otimo',
    traseiro_esquerdo: 'otimo',
    estepe: 'otimo'
  });
  
  const [equipamentos, setEquipamentos] = useState<EquipamentoChecklist[]>(
    equipamentosDefault.map(nome => ({ nome, status: 'ok' as const }))
  );
  
  const { toast } = useToast();

  useEffect(() => {
    fetchViaturas();
    
    // Preencher nome do fiscal automaticamente
    if (profile?.full_name) {
      setFormData(prev => ({
        ...prev,
        nome_guerra: profile.full_name
      }));
    }
  }, [profile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedViatura) {
      toast({
        title: "Atenção",
        description: "Selecione uma viatura",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    // Validar se todos os pneus foram avaliados
    const pneusValues = Object.values(pneus);
    if (pneusValues.some(value => !value)) {
      toast({
        title: "Atenção",
        description: "Avalie todos os pneus",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Criar checklist principal
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist_viaturas')
        .insert([{
          viatura_id: selectedViatura,
          fiscal_id: profile.id,
          ...formData
        }])
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Inserir dados dos pneus
      const { error: pneusError } = await supabase
        .from('checklist_pneus')
        .insert([{
          checklist_id: checklistData.id,
          ...pneus
        }]);

      if (pneusError) throw pneusError;

      // Inserir dados dos equipamentos
      const equipamentosData = equipamentos.map(eq => ({
        checklist_id: checklistData.id,
        equipamento_nome: eq.nome,
        status: eq.status
      }));

      const { error: equipamentosError } = await supabase
        .from('checklist_equipamentos')
        .insert(equipamentosData);

      if (equipamentosError) throw equipamentosError;

      toast({
        title: "Sucesso",
        description: "Checklist salvo com sucesso"
      });

      // Reset form
      setFormData({
        data_checklist: new Date().toISOString().split('T')[0],
        horario_checklist: new Date().toTimeString().slice(0, 5),
        nome_guerra: profile?.full_name || '',
        km_inicial: 0,
        combustivel_nivel: '',
        oleo_nivel: '',
        data_proxima_troca_oleo: '',
        km_proxima_troca_oleo: 0,
        limpeza_ok: false,
        observacoes_alteracoes: ''
      });
      setPneus({
        dianteiro_direito: 'otimo',
        dianteiro_esquerdo: 'otimo',
        traseiro_direito: 'otimo',
        traseiro_esquerdo: 'otimo',
        estepe: 'otimo'
      });
      setEquipamentos(equipamentosDefault.map(nome => ({ nome, status: 'ok' as const })));
      setSelectedViatura('');

    } catch (error: any) {
      console.error('Erro ao salvar checklist:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar checklist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'defeituoso':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'nao_tem':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const renderCombustivelIcon = (nivel: string) => {
    const percentage = {
      'reserva': '10%',
      '1/4': '25%',
      '1/2': '50%',
      '3/4': '75%',
      'cheio': '100%'
    }[nivel] || '0%';

    return (
      <div className="flex items-center gap-2">
        <Fuel className="h-4 w-4" />
        <span className="text-sm">{percentage}</span>
      </div>
    );
  };

  const renderOleoIcon = (nivel: string) => {
    return (
      <div className="flex items-center gap-2">
        <Droplets className="h-4 w-4" />
        <span className="text-sm capitalize">{nivel}</span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Car className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Checklist de Viatura</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção de Viatura */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Viatura</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedViatura} onValueChange={setSelectedViatura}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma viatura" />
              </SelectTrigger>
              <SelectContent>
                {viaturas.map((viatura) => (
                  <SelectItem key={viatura.id} value={viatura.id}>
                    {viatura.prefixo} - {viatura.placa} ({viatura.modelo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_checklist">Data</Label>
              <Input
                id="data_checklist"
                type="date"
                value={formData.data_checklist}
                onChange={(e) => setFormData({ ...formData, data_checklist: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="horario_checklist">Horário</Label>
              <Input
                id="horario_checklist"
                type="time"
                value={formData.horario_checklist}
                onChange={(e) => setFormData({ ...formData, horario_checklist: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome_guerra">Nome de Guerra</Label>
              <Input
                id="nome_guerra"
                value={formData.nome_guerra}
                onChange={(e) => setFormData({ ...formData, nome_guerra: e.target.value })}
                placeholder="Ex: Sgt. Silva"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="km_inicial">KM Inicial</Label>
              <Input
                id="km_inicial"
                type="number"
                value={formData.km_inicial}
                onChange={(e) => setFormData({ ...formData, km_inicial: parseInt(e.target.value) || 0 })}
                min="0"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Combustível e Óleo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Combustível e Óleo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de Combustível</Label>
                <Select value={formData.combustivel_nivel} onValueChange={(value) => setFormData({ ...formData, combustivel_nivel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reserva">Reserva</SelectItem>
                    <SelectItem value="1/4">1/4</SelectItem>
                    <SelectItem value="1/2">1/2</SelectItem>
                    <SelectItem value="3/4">3/4</SelectItem>
                    <SelectItem value="cheio">Cheio</SelectItem>
                  </SelectContent>
                </Select>
                {formData.combustivel_nivel && renderCombustivelIcon(formData.combustivel_nivel)}
              </div>
              
              <div className="space-y-2">
                <Label>Nível de Óleo</Label>
                <Select value={formData.oleo_nivel} onValueChange={(value) => setFormData({ ...formData, oleo_nivel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completo">Completo</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="insuficiente">Insuficiente</SelectItem>
                  </SelectContent>
                </Select>
                {formData.oleo_nivel && renderOleoIcon(formData.oleo_nivel)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
              <div className="space-y-2">
                <Label htmlFor="data_proxima_troca_oleo">Data Próxima Troca de Óleo</Label>
                <Input
                  id="data_proxima_troca_oleo"
                  type="date"
                  value={formData.data_proxima_troca_oleo}
                  onChange={(e) => setFormData({ ...formData, data_proxima_troca_oleo: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="km_proxima_troca_oleo">KM Próxima Troca de Óleo</Label>
                <Input
                  id="km_proxima_troca_oleo"
                  type="number"
                  value={formData.km_proxima_troca_oleo}
                  onChange={(e) => setFormData({ ...formData, km_proxima_troca_oleo: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avaliação dos Pneus */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliação dos Pneus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(pneus).map(([posicao, valor]) => (
                <div key={posicao} className="space-y-2">
                  <Label className="capitalize">{posicao.replace('_', ' ')}</Label>
                  <Select value={valor} onValueChange={(value) => setPneus({ ...pneus, [posicao]: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Avaliar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ruim">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Ruim</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="bom">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Bom</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="otimo">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Ótimo</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Equipamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Checklist de Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipamentos.map((equipamento, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {renderStatusIcon(equipamento.status)}
                    <span className="font-medium">{equipamento.nome}</span>
                  </div>
                  <Select 
                    value={equipamento.status} 
                    onValueChange={(value: 'ok' | 'defeituoso' | 'nao_tem') => {
                      const newEquipamentos = [...equipamentos];
                      newEquipamentos[index].status = value;
                      setEquipamentos(newEquipamentos);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ok">OK</SelectItem>
                      <SelectItem value="defeituoso">Defeituoso</SelectItem>
                      <SelectItem value="nao_tem">Não tem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Limpeza e Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Limpeza e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="limpeza_ok"
                checked={formData.limpeza_ok}
                onCheckedChange={(checked) => setFormData({ ...formData, limpeza_ok: checked })}
              />
              <Label htmlFor="limpeza_ok">Limpeza OK</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes_alteracoes">Observações e Alterações</Label>
              <Textarea
                id="observacoes_alteracoes"
                value={formData.observacoes_alteracoes}
                onChange={(e) => setFormData({ ...formData, observacoes_alteracoes: e.target.value })}
                placeholder="Descreva qualquer observação ou alteração encontrada na viatura..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botão Enviar */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={loading || !selectedViatura}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Finalizar Checklist
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};