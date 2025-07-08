import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const OccurrenceTypesConfig = () => {
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchOccurrenceTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'public_occurrence_types')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const types = Array.isArray(data.value) ? data.value : JSON.parse(data.value as string);
        setOccurrenceTypes(types);
      } else {
        // Tipos padrão se não existir configuração
        const defaultTypes = [
          'Som Alto',
          'Música Alta',
          'Festa',
          'Construção Civil',
          'Comércio Irregular',
          'Estacionamento Irregular',
          'Lixo em Local Inadequado',
          'Poluição Sonora',
          'Outros'
        ];
        setOccurrenceTypes(defaultTypes);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de ocorrência:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tipos de ocorrência",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccurrenceTypes();
  }, []);

  const addNewType = () => {
    if (!newType.trim()) {
      toast({
        title: "Erro",
        description: "Digite um tipo de ocorrência válido",
        variant: "destructive",
      });
      return;
    }

    if (occurrenceTypes.includes(newType.trim())) {
      toast({
        title: "Erro",
        description: "Este tipo de ocorrência já existe",
        variant: "destructive",
      });
      return;
    }

    setOccurrenceTypes(prev => [...prev, newType.trim()]);
    setNewType('');
  };

  const removeType = (typeToRemove: string) => {
    setOccurrenceTypes(prev => prev.filter(type => type !== typeToRemove));
  };

  const saveOccurrenceTypes = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'public_occurrence_types',
          value: occurrenceTypes,
          description: 'Tipos de ocorrência disponíveis no formulário público'
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tipos de ocorrência salvos com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao salvar tipos de ocorrência:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar tipos de ocorrência",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Carregando tipos de ocorrência...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurar Tipos de Ocorrência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adicionar novo tipo */}
        <div className="space-y-3">
          <Label htmlFor="new-type">Adicionar Novo Tipo</Label>
          <div className="flex gap-2">
            <Input
              id="new-type"
              placeholder="Digite o novo tipo de ocorrência..."
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNewType()}
            />
            <Button onClick={addNewType} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista de tipos existentes */}
        <div className="space-y-3">
          <Label>Tipos de Ocorrência Configurados</Label>
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto border rounded-md p-4">
            {occurrenceTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum tipo de ocorrência configurado
              </p>
            ) : (
              <div className="space-y-2">
                {occurrenceTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <Badge variant="secondary" className="text-sm">
                      {type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeType(type)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botão salvar */}
        <Button 
          onClick={saveOccurrenceTypes} 
          disabled={saving || occurrenceTypes.length === 0}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Instruções:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Os tipos configurados aqui aparecerão no formulário público de denúncias</li>
            <li>• É recomendado manter o tipo "Outros" para casos não especificados</li>
            <li>• As alterações serão aplicadas imediatamente ao formulário público</li>
            <li>• Tipos removidos não afetarão denúncias já cadastradas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};