import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Save, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sendDesktopNotification, requestNotificationPermission } from '@/utils/notificationUtils';

export const AttendanceTimeAlertsConfig = () => {
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [checkInterval, setCheckInterval] = useState<number>(30);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'attendance_time_limit_minutes',
          'attendance_time_alert_enabled',
          'attendance_time_alert_sound_enabled',
          'attendance_time_check_interval_seconds'
        ]);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = typeof setting.value === 'string' 
          ? setting.value 
          : JSON.stringify(setting.value);
          
        switch (setting.key) {
          case 'attendance_time_limit_minutes':
            setTimeLimit(parseInt(value) || 60);
            break;
          case 'attendance_time_alert_enabled':
            setAlertsEnabled(value === 'true');
            break;
          case 'attendance_time_alert_sound_enabled':
            setSoundEnabled(value === 'true');
            break;
          case 'attendance_time_check_interval_seconds':
            setCheckInterval(parseInt(value) || 30);
            break;
        }
      });
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'attendance_time_limit_minutes', value: timeLimit.toString() },
        { key: 'attendance_time_alert_enabled', value: alertsEnabled.toString() },
        { key: 'attendance_time_alert_sound_enabled', value: soundEnabled.toString() },
        { key: 'attendance_time_check_interval_seconds', value: checkInterval.toString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de alertas foram atualizadas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testAlert = async () => {
    const permission = await requestNotificationPermission();
    
    if (permission === 'granted') {
      sendDesktopNotification({
        title: '🧪 Teste de Alerta',
        body: 'Este é um alerta de teste do sistema de notificações. Se você viu isso, as notificações estão funcionando!',
      });

      toast({
        title: '✅ Teste enviado',
        description: 'Verifique se você recebeu a notificação desktop',
      });
    } else {
      toast({
        title: '⚠️ Permissão negada',
        description: 'Você precisa permitir notificações no navegador',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Alertas de Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Alertas de Tempo
        </CardTitle>
        <CardDescription>
          Configure alertas para denúncias que ultrapassam o tempo limite de atendimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timeLimit">Tempo Limite de Atendimento (minutos)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={5}
            max={480}
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
          />
          <p className="text-sm text-muted-foreground">
            Denúncias que ultrapassam {timeLimit} minutos serão alertadas
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="alertsEnabled">Alertas Ativos</Label>
            <p className="text-sm text-muted-foreground">
              Ativar sistema de alertas de tempo
            </p>
          </div>
          <Switch
            id="alertsEnabled"
            checked={alertsEnabled}
            onCheckedChange={setAlertsEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="soundEnabled">Som dos Alertas</Label>
            <p className="text-sm text-muted-foreground">
              Reproduzir som quando denúncia atrasa
            </p>
          </div>
          <Switch
            id="soundEnabled"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkInterval">Intervalo de Verificação (segundos)</Label>
          <Input
            id="checkInterval"
            type="number"
            min={10}
            max={300}
            value={checkInterval}
            onChange={(e) => setCheckInterval(parseInt(e.target.value) || 30)}
          />
          <p className="text-sm text-muted-foreground">
            Sistema verifica denúncias a cada {checkInterval} segundos
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={testAlert} variant="outline">
            <TestTube className="h-4 w-4 mr-2" />
            Testar Alerta
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
