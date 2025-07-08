import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SoundNotificationControl = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSoundSetting();
  }, []);

  const fetchSoundSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sound_notifications_enabled')
        .single();

      if (error) throw error;
      setSoundEnabled(data.value === true);
    } catch (error) {
      console.error('Erro ao carregar configuração de som:', error);
    }
  };

  const updateSoundSetting = async (enabled: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'sound_notifications_enabled',
          value: enabled,
          description: 'Controla se notificações sonoras estão ativadas para novas denúncias'
        });

      if (error) throw error;

      setSoundEnabled(enabled);
      toast({
        title: "Sucesso",
        description: `Notificações sonoras ${enabled ? 'ativadas' : 'desativadas'}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração de som",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          Notificações Sonoras
        </CardTitle>
        <CardDescription>
          Controla se o sistema emite som quando uma nova denúncia é recebida
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch
            id="sound-notifications"
            checked={soundEnabled}
            onCheckedChange={updateSoundSetting}
            disabled={loading}
          />
          <Label htmlFor="sound-notifications">
            {soundEnabled ? 'Ativado' : 'Desativado'}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};