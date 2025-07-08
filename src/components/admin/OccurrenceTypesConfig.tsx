import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Settings, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OccurrenceType {
  name: string;
  visible: boolean;
}

export const OccurrenceTypesConfig = () => {
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
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
        
        // Verificar se os dados já estão no novo formato (objetos com name e visible)
        if (types.length > 0 && typeof types[0] === 'object' && 'name' in types[0]) {
          setOccurrenceTypes(types as OccurrenceType[]);
        } else {
          // Converter formato antigo (array de strings) para novo formato
          const convertedTypes: OccurrenceType[] = types.map((type: string) => ({
            name: type,
            visible: true
          }));
          setOccurrenceTypes(convertedTypes);
        }
      } else {
        // Tipos padrão se não existir configuração
        const defaultTypes: OccurrenceType[] = [
          { name: 'Som Alto', visible: true },
          { name: 'Música Alta', visible: true },
          { name: 'Festa', visible: true },
          { name: 'Construção Civil', visible: true },
          { name: 'Comércio Irregular', visible: true },
          { name: 'Estacionamento Irregular', visible: true },
          { name: 'Lixo em Local Inadequado', visible: true },
          { name: 'Poluição Sonora', visible: true },
          { name: 'Outros', visible: true }
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

    if (occurrenceTypes.some(type => type.name === newType.trim())) {
      toast({
        title: "Erro",
        description: "Este tipo de ocorrência já existe",
        variant: "destructive",
      });
      return;
    }

    setOccurrenceTypes(prev => [...prev, { name: newType.trim(), visible: true }]);
    setNewType('');
  };

  const removeType = (typeToRemove: string) => {
    setOccurrenceTypes(prev => prev.filter(type => type.name !== typeToRemove));
  };

  const toggleVisibility = (typeName: string) => {
    setOccurrenceTypes(prev => 
      prev.map(type => 
        type.name === typeName 
          ? { ...type, visible: !type.visible }
          : type
      )
    );
  };

  const saveOccurrenceTypes = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'public_occurrence_types',
          value: occurrenceTypes as any,
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
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={type.visible ? "default" : "secondary"} 
                        className={`text-sm ${type.visible ? '' : 'opacity-50'}`}
                      >
                        {type.name}
                      </Badge>
                      {!type.visible && (
                        <span className="text-xs text-muted-foreground">(Oculto)</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(type.name)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title={type.visible ? "Ocultar tipo" : "Mostrar tipo"}
                      >
                        {type.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeType(type.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir tipo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            <li>• Use o botão <Eye className="h-3 w-3 inline mx-1" /> para ocultar/mostrar tipos no formulário</li>
            <li>• Use o botão <Trash2 className="h-3 w-3 inline mx-1" /> para excluir permanentemente</li>
            <li>• Tipos ocultos não aparecem no formulário mas mantêm dados existentes</li>
            <li>• As alterações serão aplicadas imediatamente ao formulário público</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};