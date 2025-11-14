import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Save, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationSettings = () => {
  const [enabled, setEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { sendNotification, permissionGranted } = usePushNotifications();

  const occurrenceTypes = [
    'Assalto', 'Roubo', 'Furto', 'Perturbação', 
    'Trânsito', 'Vandalismo', 'Outros'
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEnabled(data.enabled);
        setSoundEnabled(data.sound_enabled);
        setVibrationEnabled(data.vibration_enabled);
        setSelectedTypes(data.filtered_types || []);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const testNotification = async () => {
    if (!permissionGranted) {
      toast({
        title: 'Permissão Necessária',
        description: 'Por favor, permita notificações nas configurações do dispositivo',
        variant: 'destructive',
      });
      return;
    }

    await sendNotification({
      title: '🧪 Teste de Notificação',
      body: 'Esta é uma notificação de teste do sistema COPOM',
      sound: soundEnabled,
      vibration: vibrationEnabled,
      priority: 'high',
    });

    toast({
      title: 'Notificação Enviada',
      description: 'Verifique se a notificação apareceu no seu dispositivo',
    });
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const settings = {
        user_id: user.id,
        enabled,
        sound_enabled: soundEnabled,
        vibration_enabled: vibrationEnabled,
        filtered_types: selectedTypes,
      };

      const { error } = await supabase
        .from('notification_settings')
        .upsert(settings, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Configurações Salvas',
        description: 'As configurações de notificações foram atualizadas',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status de Permissão */}
        {!permissionGranted && (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive">
            <p className="text-sm text-destructive">
              ⚠️ Permissão de notificações negada. Por favor, habilite nas configurações do dispositivo.
            </p>
          </div>
        )}

        {/* Switches principais */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Notificações Ativas</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Som</span>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vibração</span>
            <Switch checked={vibrationEnabled} onCheckedChange={setVibrationEnabled} />
          </div>
        </div>

        {/* Filtros de tipo */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Tipos de Denúncias</h3>
          <p className="text-xs text-muted-foreground">
            Deixe vazio para receber notificações de todos os tipos
          </p>
          <div className="grid grid-cols-2 gap-2">
            {occurrenceTypes.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, type]);
                    } else {
                      setSelectedTypes(selectedTypes.filter(t => t !== type));
                    }
                  }}
                />
                <span className="text-sm">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          <Button 
            onClick={testNotification} 
            variant="outline" 
            className="flex-1"
            disabled={!permissionGranted}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Testar
          </Button>
          <Button 
            onClick={saveSettings} 
            className="flex-1"
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
