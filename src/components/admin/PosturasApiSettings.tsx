import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, TestTube, Globe } from 'lucide-react';

interface PosturasApiConfig {
  test_endpoint: string;
  test_key: string;
  test_active: boolean;
  prod_endpoint: string;
  prod_key: string;
  prod_active: boolean;
  field_mapping: {
    [key: string]: string;
  };
}

const API_FIELDS = [
  { key: 'solicitante', label: 'Solicitante', required: true },
  { key: 'telefone', label: 'Telefone', required: true },
  { key: 'logradouro_solicitante', label: 'Logradouro do Solicitante', required: true },
  { key: 'numero_solicitante', label: 'Número do Solicitante', required: false },
  { key: 'quadra_solicitante', label: 'Quadra do Solicitante', required: false },
  { key: 'lote_solicitante', label: 'Lote do Solicitante', required: false },
  { key: 'bairro_solicitante', label: 'Bairro do Solicitante', required: true },
  { key: 'documento', label: 'Documento', required: false },
  { key: 'logradouro_ocorrencia', label: 'Logradouro da Ocorrência', required: true },
  { key: 'numero_ocorrencia', label: 'Número da Ocorrência', required: false },
  { key: 'quadra_ocorrencia', label: 'Quadra da Ocorrência', required: false },
  { key: 'lote_ocorrencia', label: 'Lote da Ocorrência', required: false },
  { key: 'bairro_ocorrencia', label: 'Bairro da Ocorrência', required: true },
  { key: 'ponto_referencia', label: 'Ponto de Referência', required: false },
  { key: 'narrativa', label: 'Narrativa', required: true },
];

const COMPLAINT_FIELDS = [
  { key: 'complainant_name', label: 'Nome do Denunciante' },
  { key: 'complainant_phone', label: 'Telefone do Denunciante' },
  { key: 'complainant_type', label: 'Tipo do Denunciante' },
  { key: 'complainant_address', label: 'Endereço do Denunciante' },
  { key: 'complainant_number', label: 'Número do Denunciante' },
  { key: 'complainant_block', label: 'Quadra do Denunciante' },
  { key: 'complainant_lot', label: 'Lote do Denunciante' },
  { key: 'complainant_neighborhood', label: 'Bairro do Denunciante' },
  { key: 'occurrence_type', label: 'Tipo da Ocorrência' },
  { key: 'occurrence_address', label: 'Endereço da Ocorrência' },
  { key: 'occurrence_number', label: 'Número da Ocorrência' },
  { key: 'occurrence_block', label: 'Quadra da Ocorrência' },
  { key: 'occurrence_lot', label: 'Lote da Ocorrência' },
  { key: 'occurrence_neighborhood', label: 'Bairro da Ocorrência' },
  { key: 'occurrence_reference', label: 'Referência da Ocorrência' },
  { key: 'narrative', label: 'Narrativa' },
  { key: 'classification', label: 'Classificação' },
];

export const PosturasApiSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<PosturasApiConfig>({
    test_endpoint: '',
    test_key: '',
    test_active: false,
    prod_endpoint: '',
    prod_key: '',
    prod_active: false,
    field_mapping: {}
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'posturas_api_test_endpoint',
          'posturas_api_test_key',
          'posturas_api_test_active',
          'posturas_api_prod_endpoint',
          'posturas_api_prod_key',
          'posturas_api_prod_active',
          'posturas_api_field_mapping'
        ]);

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      const configData: any = {};
      settings?.forEach((setting) => {
        const key = setting.key.replace('posturas_api_', '');
        configData[key] = setting.value;
      });

      setConfig({
        test_endpoint: configData.test_endpoint?.[0] || '',
        test_key: configData.test_key?.[0] || '',
        test_active: configData.test_active || false,
        prod_endpoint: configData.prod_endpoint?.[0] || '',
        prod_key: configData.prod_key?.[0] || '',
        prod_active: configData.prod_active || false,
        field_mapping: configData.field_mapping || {}
      });

    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const settingsToSave = [
        { key: 'posturas_api_test_endpoint', value: [config.test_endpoint] },
        { key: 'posturas_api_test_key', value: [config.test_key] },
        { key: 'posturas_api_test_active', value: config.test_active },
        { key: 'posturas_api_prod_endpoint', value: [config.prod_endpoint] },
        { key: 'posturas_api_prod_key', value: [config.prod_key] },
        { key: 'posturas_api_prod_active', value: config.prod_active },
        { key: 'posturas_api_field_mapping', value: config.field_mapping }
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: `Configuração Posturas API - ${setting.key}`
          });
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!"
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnvironmentToggle = (environment: 'test' | 'prod', active: boolean) => {
    if (active) {
      // Se ativando um ambiente, desativar o outro
      setConfig(prev => ({
        ...prev,
        [`${environment}_active`]: true,
        [`${environment === 'test' ? 'prod' : 'test'}_active`]: false
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [`${environment}_active`]: false
      }));
    }
  };

  const updateFieldMapping = (apiField: string, complaintField: string) => {
    setConfig(prev => ({
      ...prev,
      field_mapping: {
        ...prev.field_mapping,
        [apiField]: complaintField
      }
    }));
  };

  const activeEnvironment = config.test_active ? 'test' : config.prod_active ? 'prod' : 'none';

  return (
    <div className="space-y-6">
      {/* Status Ativo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status da Integração
            {activeEnvironment !== 'none' && (
              <Badge variant={activeEnvironment === 'prod' ? 'default' : 'secondary'}>
                {activeEnvironment === 'prod' ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Produção Ativa
                  </>
                ) : (
                  <>
                    <TestTube className="h-3 w-3 mr-1" />
                    Teste Ativo
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Ambiente atualmente configurado para envio das denúncias
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Ambiente de Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Ambiente de Teste
          </CardTitle>
          <CardDescription>
            Configurações para ambiente de homologação/teste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="test_endpoint">Endpoint de Teste</Label>
              <Input
                id="test_endpoint"
                value={config.test_endpoint}
                onChange={(e) => setConfig(prev => ({ ...prev, test_endpoint: e.target.value }))}
                placeholder="https://tecnologia2.rioverde.go.gov.br/homologacao/ricardo/posturas/webservice/bridge"
              />
            </div>
            <div>
              <Label htmlFor="test_key">Chave de Acesso (Teste)</Label>
              <Input
                id="test_key"
                type="password"
                value={config.test_key}
                onChange={(e) => setConfig(prev => ({ ...prev, test_key: e.target.value }))}
                placeholder="@pk-L3@0Ch@T30t!77$251Mwf2*#]H[3"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="test_active"
                checked={config.test_active}
                onCheckedChange={(checked) => handleEnvironmentToggle('test', checked)}
              />
              <Label htmlFor="test_active">Ativar Ambiente de Teste</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ambiente de Produção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Ambiente de Produção
          </CardTitle>
          <CardDescription>
            Configurações para ambiente de produção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="prod_endpoint">Endpoint de Produção</Label>
              <Input
                id="prod_endpoint"
                value={config.prod_endpoint}
                onChange={(e) => setConfig(prev => ({ ...prev, prod_endpoint: e.target.value }))}
                placeholder="URL do endpoint de produção"
              />
            </div>
            <div>
              <Label htmlFor="prod_key">Chave de Acesso (Produção)</Label>
              <Input
                id="prod_key"
                type="password"
                value={config.prod_key}
                onChange={(e) => setConfig(prev => ({ ...prev, prod_key: e.target.value }))}
                placeholder="Chave de acesso de produção"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="prod_active"
                checked={config.prod_active}
                onCheckedChange={(checked) => handleEnvironmentToggle('prod', checked)}
              />
              <Label htmlFor="prod_active">Ativar Ambiente de Produção</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Mapeamento de Campos */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Campos</CardTitle>
          <CardDescription>
            Configure qual campo do sistema será enviado para cada parâmetro da API da Posturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {API_FIELDS.map((apiField) => (
              <div key={apiField.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <Label className="flex items-center gap-2">
                    {apiField.label}
                    {apiField.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                  </Label>
                  <p className="text-xs text-muted-foreground">{apiField.key}</p>
                </div>
                <Select
                  value={config.field_mapping[apiField.key] || 'unmapped'}
                  onValueChange={(value) => updateFieldMapping(apiField.key, value === 'unmapped' ? '' : value)}
                >
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Selecione o campo do sistema..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-input shadow-lg z-50">
                    <SelectItem value="unmapped">Não mapear</SelectItem>
                    {COMPLAINT_FIELDS.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};