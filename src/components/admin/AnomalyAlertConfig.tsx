import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bell, Mail, MessageSquare, Save, Play, History, Loader2 } from 'lucide-react';

interface AlertSettings {
  id: string;
  enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  email_recipients: string[];
  whatsapp_recipients: string[];
  thresholds: {
    hourly_increase_percent: number;
    daily_increase_percent: number;
    unusual_hour_threshold: number;
    unusual_hour_min: number;
    unusual_hour_max: number;
  };
}

interface AlertHistory {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  details: any;
  sent_email: boolean;
  sent_whatsapp: boolean;
  created_at: string;
}

export const AnomalyAlertConfig = () => {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data as any);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data as AlertHistory[]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('alert_settings')
        .update({
          enabled: settings.enabled,
          email_enabled: settings.email_enabled,
          whatsapp_enabled: settings.whatsapp_enabled,
          email_recipients: settings.email_recipients,
          whatsapp_recipients: settings.whatsapp_recipients,
          thresholds: settings.thresholds,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de alertas foram atualizadas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlerts = async () => {
    try {
      setTesting(true);
      const { error } = await supabase.functions.invoke('check-anomalies');

      if (error) throw error;

      toast({
        title: 'Verificação executada',
        description: 'A verificação de anomalias foi executada com sucesso',
      });
      
      await loadHistory();
    } catch (error) {
      console.error('Erro ao testar alertas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a verificação',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const addEmailRecipient = () => {
    if (!settings || !emailInput.trim()) return;
    
    if (!emailInput.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido',
        variant: 'destructive',
      });
      return;
    }

    setSettings({
      ...settings,
      email_recipients: [...settings.email_recipients, emailInput.trim()],
    });
    setEmailInput('');
  };

  const removeEmailRecipient = (email: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      email_recipients: settings.email_recipients.filter(e => e !== email),
    });
  };

  const addWhatsAppRecipient = () => {
    if (!settings || !whatsappInput.trim()) return;
    
    const phone = whatsappInput.replace(/\D/g, '');
    if (phone.length < 10) {
      toast({
        title: 'Número inválido',
        description: 'Por favor, insira um número válido',
        variant: 'destructive',
      });
      return;
    }

    setSettings({
      ...settings,
      whatsapp_recipients: [...settings.whatsapp_recipients, phone],
    });
    setWhatsappInput('');
  };

  const removeWhatsAppRecipient = (phone: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      whatsapp_recipients: settings.whatsapp_recipients.filter(p => p !== phone),
    });
  };

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Sistema de Alertas de Anomalias</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
              <span className="text-sm">{settings.enabled ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>
          <CardDescription>
            Detecta e notifica automaticamente sobre padrões anormais nas denúncias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configurações de Email */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label>Alertas por Email</Label>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, email_enabled: checked })}
                disabled={!settings.enabled}
              />
            </div>
            
            {settings.email_enabled && (
              <div className="space-y-2 pl-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="email@exemplo.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                  />
                  <Button onClick={addEmailRecipient} variant="outline">Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.email_recipients.map((email, idx) => (
                    <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeEmailRecipient(email)}>
                      {email} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Configurações de WhatsApp */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <Label>Alertas por WhatsApp</Label>
              </div>
              <Switch
                checked={settings.whatsapp_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, whatsapp_enabled: checked })}
                disabled={!settings.enabled}
              />
            </div>
            
            {settings.whatsapp_enabled && (
              <div className="space-y-2 pl-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="5562999887766"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addWhatsAppRecipient()}
                  />
                  <Button onClick={addWhatsAppRecipient} variant="outline">Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.whatsapp_recipients.map((phone, idx) => (
                    <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeWhatsAppRecipient(phone)}>
                      {phone} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Thresholds */}
          <div className="space-y-4">
            <h4 className="font-semibold">Limites de Detecção</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aumento Horário (%)</Label>
                <Input
                  type="number"
                  value={settings.thresholds.hourly_increase_percent}
                  onChange={(e) => setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, hourly_increase_percent: parseInt(e.target.value) || 0 }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta quando houver aumento acima deste percentual na última hora
                </p>
              </div>

              <div className="space-y-2">
                <Label>Aumento Diário (%)</Label>
                <Input
                  type="number"
                  value={settings.thresholds.daily_increase_percent}
                  onChange={(e) => setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, daily_increase_percent: parseInt(e.target.value) || 0 }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta quando houver aumento acima deste percentual nas últimas 24h
                </p>
              </div>

              <div className="space-y-2">
                <Label>Limite Horário Atípico</Label>
                <Input
                  type="number"
                  value={settings.thresholds.unusual_hour_threshold}
                  onChange={(e) => setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, unusual_hour_threshold: parseInt(e.target.value) || 0 }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Número de denúncias em horário atípico para gerar alerta
                </p>
              </div>

              <div className="space-y-2">
                <Label>Horário Atípico (madrugada)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    min="0"
                    max="23"
                    value={settings.thresholds.unusual_hour_min}
                    onChange={(e) => setSettings({
                      ...settings,
                      thresholds: { ...settings.thresholds, unusual_hour_min: parseInt(e.target.value) || 0 }
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    min="0"
                    max="23"
                    value={settings.thresholds.unusual_hour_max}
                    onChange={(e) => setSettings({
                      ...settings,
                      thresholds: { ...settings.thresholds, unusual_hour_max: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Intervalo de horas considerado atípico (ex: 0h às 6h)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
            <Button onClick={handleTestAlerts} variant="outline" disabled={testing || !settings.enabled}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Verificar Agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alertas
          </CardTitle>
          <CardDescription>Últimos 10 alertas detectados pelo sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum alerta registrado ainda
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((alert) => (
                <div key={alert.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity === 'high' ? 'ALTA' : alert.severity === 'medium' ? 'MÉDIA' : 'BAIXA'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{alert.message}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {alert.sent_email && <Mail className="h-4 w-4 text-muted-foreground" />}
                      {alert.sent_whatsapp && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {alert.details && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(alert.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tipos de Anomalias Detectadas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Pico Horário:</strong> Aumento súbito comparado à hora anterior</p>
          <p>• <strong>Pico Diário:</strong> Aumento significativo comparado ao dia anterior</p>
          <p>• <strong>Horário Atípico:</strong> Volume anormal de denúncias na madrugada</p>
          <p>• <strong>Concentração por Tipo:</strong> Muitas denúncias do mesmo tipo em curto período</p>
        </CardContent>
      </Card>
    </div>
  );
};
