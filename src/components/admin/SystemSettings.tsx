
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SystemSettings = () => {
  const [settings, setSettings] = useState({
    system_name: '',
    system_description: '',
    maintenance_mode: false,
    max_complaints_per_day: 50,
    auto_backup_enabled: true,
    audit_log_retention_days: 365
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', [
          'system_name',
          'system_description',
          'maintenance_mode',
          'max_complaints_per_day',
          'auto_backup_enabled',
          'audit_log_retention_days'
        ]);

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as any) || {};

      setSettings({
        system_name: settingsMap.system_name || 'Posturas Rio Verde',
        system_description: settingsMap.system_description || 'Sistema de Denúncias',
        maintenance_mode: settingsMap.maintenance_mode || false,
        max_complaints_per_day: settingsMap.max_complaints_per_day || 50,
        auto_backup_enabled: settingsMap.auto_backup_enabled !== false,
        audit_log_retention_days: settingsMap.audit_log_retention_days || 365
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do sistema",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsToSave = [
        { key: 'system_name', value: settings.system_name, description: 'Nome do sistema' },
        { key: 'system_description', value: settings.system_description, description: 'Descrição do sistema' },
        { key: 'maintenance_mode', value: settings.maintenance_mode, description: 'Modo de manutenção ativo' },
        { key: 'max_complaints_per_day', value: settings.max_complaints_per_day, description: 'Máximo de denúncias por dia' },
        { key: 'auto_backup_enabled', value: settings.auto_backup_enabled, description: 'Backup automático habilitado' },
        { key: 'audit_log_retention_days', value: settings.audit_log_retention_days, description: 'Dias de retenção dos logs de auditoria' }
      ];

      for (const setting of settingsToSave) {
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
        description: "Configurações do sistema salvas com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do sistema",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="system_name">Nome do Sistema</Label>
            <Input
              id="system_name"
              value={settings.system_name}
              onChange={(e) => setSettings(prev => ({ ...prev, system_name: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="system_description">Descrição do Sistema</Label>
            <Input
              id="system_description"
              value={settings.system_description}
              onChange={(e) => setSettings(prev => ({ ...prev, system_description: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Operacionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenance_mode"
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, maintenance_mode: checked }))
              }
            />
            <Label htmlFor="maintenance_mode">Modo de Manutenção</Label>
          </div>
          
          <div>
            <Label htmlFor="max_complaints_per_day">Máximo de Denúncias por Dia</Label>
            <Input
              id="max_complaints_per_day"
              type="number"
              value={settings.max_complaints_per_day}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                max_complaints_per_day: parseInt(e.target.value) || 50 
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto_backup_enabled"
              checked={settings.auto_backup_enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, auto_backup_enabled: checked }))
              }
            />
            <Label htmlFor="auto_backup_enabled">Backup Automático</Label>
          </div>
          
          <div>
            <Label htmlFor="audit_log_retention_days">Retenção de Logs (dias)</Label>
            <Input
              id="audit_log_retention_days"
              type="number"
              value={settings.audit_log_retention_days}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                audit_log_retention_days: parseInt(e.target.value) || 365 
              }))}
            />
            <p className="text-sm text-gray-500 mt-1">
              Por quantos dias manter os logs de auditoria
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
};
