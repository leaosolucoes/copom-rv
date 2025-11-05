import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, HelpCircle, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MetaConfig {
  whatsapp_meta_access_token: string;
  whatsapp_meta_phone_number_id: string;
  whatsapp_meta_waba_id: string;
  whatsapp_meta_graph_api_version: string;
  whatsapp_meta_webhook_verify_token: string;
  whatsapp_meta_webhook_secret: string;
  whatsapp_meta_auto_send_enabled: boolean;
  whatsapp_meta_phone_numbers: string;
  whatsapp_meta_message_template: string;
}

export default function WhatsAppMetaConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [config, setConfig] = useState<MetaConfig>({
    whatsapp_meta_access_token: "",
    whatsapp_meta_phone_number_id: "",
    whatsapp_meta_waba_id: "",
    whatsapp_meta_graph_api_version: "v20.0",
    whatsapp_meta_webhook_verify_token: "",
    whatsapp_meta_webhook_secret: "",
    whatsapp_meta_auto_send_enabled: false,
    whatsapp_meta_phone_numbers: "",
    whatsapp_meta_message_template: `🔔 *NOVA DENÚNCIA REGISTRADA*

📋 *Protocolo:* {{protocol_number}}
📅 *Data:* {{created_at}}

👤 *Denunciante:* {{complainant_name}}
📱 *Telefone:* {{complainant_phone}}

📍 *Local da Ocorrência:*
{{occurrence_address}}, {{occurrence_number}}
{{occurrence_neighborhood}} - {{occurrence_city}}/{{occurrence_state}}

🏷️ *Tipo:* {{occurrence_type}}
📝 *Descrição:* {{description}}

⚠️ *Status:* {{status}}`,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .like("key", "whatsapp_meta_%");

      if (error) throw error;

      const configData: any = {};
      data?.forEach((setting) => {
        const value = setting.value;
        if (setting.key === "whatsapp_meta_auto_send_enabled") {
          configData[setting.key] = value === true || value === "true";
        } else {
          configData[setting.key] = value || "";
        }
      });

      setConfig((prev) => ({ ...prev, ...configData }));
    } catch (error: any) {
      console.error("Erro ao buscar configurações:", error);
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      for (const [key, value] of Object.entries(config)) {
        const { error } = await supabase.from("system_settings").upsert({
          key,
          value,
          description: `Configuração WhatsApp Meta: ${key}`,
        });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações da API Meta foram salvas com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testWhatsApp = async () => {
    try {
      setTesting(true);

      if (!config.whatsapp_meta_access_token || !config.whatsapp_meta_phone_number_id) {
        toast({
          title: "Configuração incompleta",
          description: "Access Token e Phone Number ID são obrigatórios para o teste.",
          variant: "destructive",
        });
        return;
      }

      if (!config.whatsapp_meta_phone_numbers) {
        toast({
          title: "Números não configurados",
          description: "Configure pelo menos um número para receber a mensagem de teste.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("test-whatsapp-meta", {
        body: {
          phoneNumbers: config.whatsapp_meta_phone_numbers,
          message: "🧪 Teste de integração WhatsApp Meta API - Sistema de Denúncias",
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Teste realizado com sucesso!",
          description: `Mensagem enviada para: ${data.results?.filter((r: any) => r.success).length} número(s)`,
        });
      } else {
        toast({
          title: "Erro no teste",
          description: data.error || "Falha ao enviar mensagem de teste",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao testar:", error);
      toast({
        title: "Erro ao testar WhatsApp",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const webhookUrl = `${window.location.origin.replace('localhost', 'doyttekxvonlwmmxfezd.supabase.co')}/functions/v1/whatsapp-meta-webhook`;

  return (
    <div className="space-y-6">
      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertDescription>
          Configure a integração oficial com a API do WhatsApp Business da Meta. Esta é a solução oficial
          recomendada para empresas que precisam de alta confiabilidade e conformidade.
        </AlertDescription>
      </Alert>

      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  <CardTitle>Como obter as credenciais da Meta</CardTitle>
                </div>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Access Token (Token de Acesso)</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Meta Business Suite <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Vá em Configurações {'>'} Usuários do Sistema</li>
                  <li>Crie um System User ou selecione um existente</li>
                  <li>Gere um token com permissões: <code className="bg-muted px-1 rounded">whatsapp_business_messaging</code> e <code className="bg-muted px-1 rounded">whatsapp_business_management</code></li>
                  <li>Configure o token para não expirar</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Phone Number ID e WABA ID</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Selecione seu App ou crie um novo</li>
                  <li>Adicione o produto WhatsApp Business</li>
                  <li>Vá em WhatsApp {'>'} Início rápido</li>
                  <li>Copie o Phone Number ID e o WhatsApp Business Account ID</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Configuração do Webhook</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>No painel do App, vá em WhatsApp {'>'} Configuração</li>
                  <li>Configure a URL do webhook: <code className="bg-muted px-1 rounded text-xs break-all">{webhookUrl}</code></li>
                  <li>Use o Verify Token configurado abaixo</li>
                  <li>Assine os campos: <code className="bg-muted px-1 rounded">messages</code> e <code className="bg-muted px-1 rounded">message_status</code></li>
                </ol>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais da API Meta</CardTitle>
          <CardDescription>Configure as credenciais obtidas no Meta Business Manager</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token *</Label>
            <Input
              id="access_token"
              type="password"
              placeholder="EAAxxxxxxxxxxxx..."
              value={config.whatsapp_meta_access_token}
              onChange={(e) =>
                setConfig({ ...config, whatsapp_meta_access_token: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">Token permanente do System User</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID *</Label>
              <Input
                id="phone_number_id"
                placeholder="123456789012345"
                value={config.whatsapp_meta_phone_number_id}
                onChange={(e) =>
                  setConfig({ ...config, whatsapp_meta_phone_number_id: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
              <Input
                id="waba_id"
                placeholder="123456789012345"
                value={config.whatsapp_meta_waba_id}
                onChange={(e) =>
                  setConfig({ ...config, whatsapp_meta_waba_id: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_version">Versão da Graph API</Label>
            <Select
              value={config.whatsapp_meta_graph_api_version}
              onValueChange={(value) =>
                setConfig({ ...config, whatsapp_meta_graph_api_version: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v18.0">v18.0</SelectItem>
                <SelectItem value="v19.0">v19.0</SelectItem>
                <SelectItem value="v20.0">v20.0 (Recomendado)</SelectItem>
                <SelectItem value="v21.0">v21.0</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Webhook</CardTitle>
          <CardDescription>Tokens para validação de webhooks da Meta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook_url">URL do Webhook (Copie e configure na Meta)</Label>
            <div className="flex gap-2">
              <Input
                id="webhook_url"
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast({ title: "URL copiada!" });
                }}
              >
                Copiar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verify_token">Verify Token</Label>
              <Input
                id="verify_token"
                placeholder="seu_token_secreto_123"
                value={config.whatsapp_meta_webhook_verify_token}
                onChange={(e) =>
                  setConfig({ ...config, whatsapp_meta_webhook_verify_token: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">Crie um token personalizado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Webhook Secret (App Secret)</Label>
              <Input
                id="webhook_secret"
                type="password"
                placeholder="xxxxxxxxxxxxxxxx"
                value={config.whatsapp_meta_webhook_secret}
                onChange={(e) =>
                  setConfig({ ...config, whatsapp_meta_webhook_secret: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">Secret do App para validação</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Mensagens</CardTitle>
          <CardDescription>Configure o envio automático e o template de mensagens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_send">Envio Automático</Label>
              <p className="text-sm text-muted-foreground">
                Enviar notificação automaticamente ao registrar nova denúncia
              </p>
            </div>
            <Switch
              id="auto_send"
              checked={config.whatsapp_meta_auto_send_enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, whatsapp_meta_auto_send_enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_numbers">Números para Notificação</Label>
            <Input
              id="phone_numbers"
              placeholder="5562999999999, 5562988888888"
              value={config.whatsapp_meta_phone_numbers}
              onChange={(e) =>
                setConfig({ ...config, whatsapp_meta_phone_numbers: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Números no formato internacional (DDI + DDD + Número), separados por vírgula
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_template">Template de Mensagem</Label>
            <Textarea
              id="message_template"
              rows={12}
              value={config.whatsapp_meta_message_template}
              onChange={(e) =>
                setConfig({ ...config, whatsapp_meta_message_template: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: {"{"}{"{"} protocol_number {"}"}{"}"},  {"{"}{"{"} created_at {"}"}{"}"},  {"{"}{"{"} complainant_name {"}"}{"}"},  {"{"}{"{"} complainant_phone {"}"}{"}"},  {"{"}{"{"} occurrence_address {"}"}{"}"},  {"{"}{"{"} occurrence_type {"}"}{"}"},  {"{"}{"{"} description {"}"}{"}"},  {"{"}{"{"} status {"}"}{"}"}, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={saveConfig} disabled={saving} className="flex-1">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
        <Button onClick={testWhatsApp} disabled={testing} variant="outline">
          {testing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Testar WhatsApp
        </Button>
      </div>
    </div>
  );
}
