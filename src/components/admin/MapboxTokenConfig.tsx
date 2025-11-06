import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Map, Save, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const MapboxTokenConfig = () => {
  const [token, setToken] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchToken();
  }, []);

  const fetchToken = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'mapbox_public_token')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const tokenValue = typeof data.value === 'string' 
          ? data.value 
          : JSON.stringify(data.value).replace(/^"|"$/g, '');
        setToken(tokenValue);
      }
    } catch (error) {
      console.error('Erro ao buscar token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o token do Mapbox',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testToken = async () => {
    if (!token.trim()) {
      setTestResult({ success: false, message: 'Por favor, insira um token' });
      return;
    }

    if (!token.startsWith('pk.')) {
      setTestResult({ success: false, message: 'Token inválido - deve começar com "pk."' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Testar o token fazendo uma requisição à API do Mapbox
      const response = await fetch(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${token}`
      );

      if (response.ok) {
        setTestResult({ 
          success: true, 
          message: '✅ Token válido! O Mapbox respondeu com sucesso.' 
        });
      } else {
        const errorText = await response.text();
        setTestResult({ 
          success: false, 
          message: `❌ Token inválido (${response.status}): ${errorText.substring(0, 100)}` 
        });
      }
    } catch (error) {
      console.error('Erro ao testar token:', error);
      setTestResult({ 
        success: false, 
        message: `❌ Erro ao conectar com Mapbox: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setTesting(false);
    }
  };

  const saveToken = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(token) })
        .eq('key', 'mapbox_public_token');

      if (error) throw error;

      toast({
        title: 'Token salvo',
        description: 'O token do Mapbox foi configurado com sucesso',
      });
      
      setTestResult(null);
    } catch (error) {
      console.error('Erro ao salvar token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o token do Mapbox',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Configuração do Mapbox
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
          <Map className="h-5 w-5" />
          Configuração do Mapbox
        </CardTitle>
        <CardDescription>
          Configure o token público do Mapbox para habilitar mapas interativos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mapbox-token">Token Público do Mapbox</Label>
          <Input
            id="mapbox-token"
            type="text"
            placeholder="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Para obter um token público do Mapbox:
          </p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Acesse <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">mapbox.com <ExternalLink className="h-3 w-3" /></a></li>
            <li>Crie uma conta gratuita ou faça login</li>
            <li>Acesse a seção "Tokens" no dashboard</li>
            <li>Copie o token público padrão ou crie um novo</li>
            <li>Cole o token no campo acima</li>
          </ol>
        </div>

        <div className="bg-muted/50 border border-muted rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">ℹ️ Informações Importantes</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• O token público do Mapbox é seguro para uso no frontend</li>
            <li>• O Mapbox oferece um plano gratuito com 50.000 carregamentos de mapa por mês</li>
            <li>• O mapa mostrará apenas denúncias que possuem dados de localização GPS</li>
            <li>• A localização é capturada automaticamente quando o denunciante permite</li>
          </ul>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg text-sm ${
            testResult.success 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {testResult.message}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testToken} 
            disabled={testing || !token.trim()}
            variant="outline"
          >
            {testing ? 'Testando...' : 'Testar Token'}
          </Button>
          
          <Button 
            onClick={saveToken} 
            disabled={saving || !token.trim() || (testResult && !testResult.success)}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Token'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
