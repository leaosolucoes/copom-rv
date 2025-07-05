
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
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', [
          'whatsapp_api_key',
          'whatsapp_api_url', 
          'whatsapp_phone_number',
          'whatsapp_message_template',
          'whatsapp_send_full_complaint',
          'whatsapp_auto_send_enabled'
        ]);

      if (error) throw error;

      const settings = data?.reduce((acc, setting) => {
        const key = setting.key.replace('whatsapp_', '');
        acc[key] = setting.value;
        return acc;
      }, {} as any) || {};

      setConfig({
        api_key: settings.api_key || '',
        api_url: settings.api_url || '',
        phone_number: settings.phone_number || '',
        message_template: settings.message_template || 'Nova denúncia recebida no sistema Posturas Rio Verde.\n\nDenunciante: {complainant_name}\nTelefone: {complainant_phone}\nTipo: {occurrence_type}\nEndereço: {occurrence_address}\nData: {occurrence_date}\n\nAcesse o sistema para mais detalhes.',
        send_full_complaint: settings.send_full_complaint || false,
        auto_send_enabled: settings.auto_send_enabled !== false
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
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

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const settings = [
        { key: 'whatsapp_api_key', value: config.api_key, description: 'API Key da Evolution API' },
        { key: 'whatsapp_api_url', value: config.api_url, description: 'URL da Evolution API' },
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
      console.error('Erro ao salvar configurações:', error);
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
    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp', {
        body: { 
          phoneNumber: config.phone_number,
          message: 'Teste de integração WhatsApp - Sistema Posturas Rio Verde'
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Mensagem de teste enviada com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao testar WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem de teste",
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
            <Label htmlFor="phone_number">Número do WhatsApp</Label>
            <Input
              id="phone_number"
              value={config.phone_number}
              onChange={(e) => setConfig(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="556299999999"
            />
            <p className="text-sm text-gray-500 mt-1">
              Número que receberá as notificações (formato: código do país + DDD + número)
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
              Variáveis disponíveis: {'{complainant_name}'}, {'{complainant_phone}'}, {'{occurrence_type}'}, {'{occurrence_address}'}, {'{occurrence_date}'}, {'{narrative}'}
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
