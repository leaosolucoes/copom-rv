
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const WhatsAppConfig = () => {
  const [config, setConfig] = useState({
    api_key: '',
    api_url: '',
    instance_name: '',
    phone_number: '',
    message_template: '',
    send_full_complaint: false,
    auto_send_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      console.log('Carregando configurações do WhatsApp...');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', [
          'whatsapp_api_key',
          'whatsapp_api_url', 
          'whatsapp_instance_name',
          'whatsapp_phone_number',
          'whatsapp_message_template',
          'whatsapp_send_full_complaint',
          'whatsapp_auto_send_enabled'
        ]);

      console.log('Dados retornados do banco:', data);
      console.log('Erro (se houver):', error);

      if (error) throw error;

      const settings = data?.reduce((acc, setting) => {
        const key = setting.key.replace('whatsapp_', '');
        acc[key] = setting.value;
        console.log(`Configuração encontrada: ${key} = ${setting.value}`);
        return acc;
      }, {} as any) || {};

      console.log('Settings processados:', settings);

      setConfig({
        api_key: settings.api_key || '',
        api_url: settings.api_url || '',
        instance_name: settings.instance_name || '',
        phone_number: settings.phone_number || '',
        message_template: settings.message_template || `🚨 *NOVA DENÚNCIA REGISTRADA*

📋 *Sistema de Posturas - Rio Verde*

👤 *DADOS DO DENUNCIANTE:*
• Nome: {complainant_name}
• Telefone: {complainant_phone}
• Tipo: {complainant_type}
• Endereço: {complainant_address}
• Número: {complainant_number}
• Quadra: {complainant_block}
• Lote: {complainant_lot}
• Bairro: {complainant_neighborhood}

📍 *LOCAL DA OCORRÊNCIA:*
• Endereço: {occurrence_address}
• Número: {occurrence_number}
• Quadra: {occurrence_block}
• Lote: {occurrence_lot}
• Bairro: {occurrence_neighborhood}
• Ponto de Referência: {occurrence_reference}
• Data: {occurrence_date}
• Horário: {occurrence_time}

⚠️ *TIPO DE OCORRÊNCIA:*
{occurrence_type}

📊 *CLASSIFICAÇÃO:*
{classification}

👤 *ATRIBUÍDO PARA:*
{assigned_to}

📝 *NARRATIVA COMPLETA:*
{narrative}

🏛️ *Secretaria Municipal de Posturas*
_Acesse o sistema para mais detalhes e acompanhamento._`,
        send_full_complaint: settings.send_full_complaint || false,
        auto_send_enabled: settings.auto_send_enabled !== false
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do WhatsApp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Auto-salvar template padrão se não existir
  useEffect(() => {
    const autoSaveTemplate = async () => {
      if (!loading && config.message_template && config.message_template.includes('🚨 *NOVA DENÚNCIA REGISTRADA*')) {
        // Se o template atual é o padrão e não está salvo no banco, salvar automaticamente
        try {
          const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'whatsapp_message_template')
            .single();
          
          if (!data) {
            // Template não existe no banco, salvar o padrão
            await supabase
              .from('system_settings')
              .upsert({
                key: 'whatsapp_message_template',
                value: config.message_template,
                description: 'Template da mensagem automática'
              }, {
                onConflict: 'key'
              });
              
            toast({
              title: "Template Salvo",
              description: "Template padrão criado e salvo automaticamente!",
            });
          }
        } catch (error) {
          // Template já existe ou erro silencioso
        }
      }
    };

    if (!loading) {
      autoSaveTemplate();
    }
  }, [loading, config.message_template, toast]);

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const settings = [
        { key: 'whatsapp_api_key', value: config.api_key, description: 'API Key da Evolution API' },
        { key: 'whatsapp_api_url', value: config.api_url, description: 'URL da Evolution API' },
        { key: 'whatsapp_instance_name', value: config.instance_name, description: 'Nome da instância Evolution API' },
        { key: 'whatsapp_phone_number', value: config.phone_number, description: 'Número do WhatsApp para receber notificações' },
        { key: 'whatsapp_message_template', value: config.message_template, description: 'Template da mensagem automática' },
        { key: 'whatsapp_send_full_complaint', value: config.send_full_complaint, description: 'Enviar denúncia completa ou apenas resumo' },
        { key: 'whatsapp_auto_send_enabled', value: config.auto_send_enabled, description: 'Envio automático habilitado' }
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Configurações do WhatsApp salvas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do WhatsApp",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testWhatsApp = async () => {
    // Validar se as configurações estão completas
    if (!config.api_key || !config.api_url || !config.instance_name || !config.phone_number) {
      toast({
        title: "Configurações Incompletas",
        description: "Por favor, preencha a API Key, URL da API, nome da instância e número do telefone antes de testar.",
        variant: "destructive",
      });
      return;
    }

    // Processar todos os números
    const phoneNumbers = config.phone_number.split(',').map(num => num.trim()).filter(num => num.length > 0);

    if (phoneNumbers.length === 0) {
      toast({
        title: "Nenhum número encontrado",
        description: "Verifique se os números foram inseridos corretamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = { 
        phoneNumbers: phoneNumbers, // Enviando todos os números
        message: 'Template será usado pela edge function'
      }

      const { data, error } = await supabase.functions.invoke('test-whatsapp', {
        body: payload
      });

      if (error) {
        throw new Error(`Erro na edge function: ${error.message || JSON.stringify(error)}`)
      }

      if (data?.success || data?.partial) {
        const message = data.success 
          ? data.message 
          : `${data.message}. Alguns números podem ter falhado.`;
        
        toast({
          title: "Sucesso",
          description: message + (data.details ? ` (${data.details.successCount}/${data.details.totalNumbers})` : ''),
        });
      } else {
        const errorMsg = data?.error || 'Erro desconhecido na resposta'
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      
      let errorMessage = 'Erro ao enviar mensagem de teste'
      
      if (error.message?.includes('Failed to send a request')) {
        errorMessage = 'Falha na conexão com o servidor. Verifique sua conexão de internet.'
      } else if (error.message?.includes('Edge Function')) {
        errorMessage = 'Erro no servidor. Tente novamente em alguns segundos.'
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Evolution API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="Digite a API Key da Evolution API"
            />
          </div>
          
          <div>
            <Label htmlFor="api_url">URL da API</Label>
            <Input
              id="api_url"
              value={config.api_url}
              onChange={(e) => setConfig(prev => ({ ...prev, api_url: e.target.value }))}
              placeholder="https://your-evolution-api.com"
            />
          </div>
          
          <div>
            <Label htmlFor="instance_name">Nome da Instância</Label>
            <Input
              id="instance_name"
              value={config.instance_name}
              onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))}
              placeholder="nome-da-instancia"
            />
            <p className="text-sm text-gray-500 mt-1">
              Nome da instância configurada na Evolution API
            </p>
          </div>
          
          <div>
            <Label htmlFor="phone_number">Números do WhatsApp</Label>
            <Input
              id="phone_number"
              value={config.phone_number}
              onChange={(e) => setConfig(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="556299999999, 556288888888, 556277777777"
            />
            <p className="text-sm text-gray-500 mt-1">
              Números que receberão as notificações (formato: código do país + DDD + número). 
              Para múltiplos números, separe por vírgula.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Mensagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto_send_enabled"
              checked={config.auto_send_enabled}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, auto_send_enabled: checked }))
              }
            />
            <Label htmlFor="auto_send_enabled">Envio automático habilitado</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="send_full_complaint"
              checked={config.send_full_complaint}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, send_full_complaint: checked }))
              }
            />
            <Label htmlFor="send_full_complaint">Enviar denúncia completa</Label>
          </div>

          <div>
            <Label htmlFor="message_template">Template da Mensagem</Label>
            <Textarea
              id="message_template"
              value={config.message_template}
              onChange={(e) => setConfig(prev => ({ ...prev, message_template: e.target.value }))}
              rows={8}
              placeholder="Digite o template da mensagem..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Variáveis disponíveis: {'{complainant_name}'}, {'{complainant_phone}'}, {'{complainant_type}'}, {'{complainant_address}'}, {'{complainant_number}'}, {'{complainant_block}'}, {'{complainant_lot}'}, {'{complainant_neighborhood}'}, {'{occurrence_type}'}, {'{occurrence_address}'}, {'{occurrence_number}'}, {'{occurrence_block}'}, {'{occurrence_lot}'}, {'{occurrence_neighborhood}'}, {'{occurrence_reference}'}, {'{occurrence_date}'}, {'{occurrence_time}'}, {'{classification}'}, {'{assigned_to}'}, {'{narrative}'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-4">
        <Button onClick={saveConfig} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
        
        <Button variant="outline" onClick={testWhatsApp}>
          <TestTube className="h-4 w-4 mr-2" />
          Testar WhatsApp
        </Button>
      </div>
    </div>
  );
};
