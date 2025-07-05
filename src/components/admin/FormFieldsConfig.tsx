import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'tel' | 'date' | 'time';
  options?: string[];
  required: boolean;
  visible: boolean;
  order_index: number;
  section: 'complainant' | 'occurrence' | 'complaint';
}

export const FormFieldsConfig = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text' as FormField['type'],
    options: '',
    required: true,
    visible: true,
    section: 'complainant' as FormField['section']
  });
  const { toast } = useToast();

  const fetchFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'form_fields_config')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        setFields(data.value as unknown as FormField[]);
      } else {
        // Initialize with basic fields if none exist
        const basicFields: FormField[] = [
          { 
            id: '1', name: 'complainant_name', label: 'Nome do Denunciante', 
            type: 'text', required: true, visible: true, order_index: 1, section: 'complainant' 
          },
          { 
            id: '2', name: 'occurrence_type', label: 'Tipo de Ocorrência', 
            type: 'select', options: ['Som Alto', 'Música Alta', 'Festa', 'Outros'], 
            required: true, visible: true, order_index: 1, section: 'occurrence' 
          },
          { 
            id: '3', name: 'narrative', label: 'Narrativa da Denúncia', 
            type: 'textarea', required: true, visible: true, order_index: 1, section: 'complaint' 
          }
        ];
        setFields(basicFields);
        await saveFieldsConfig(basicFields);
      }
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configuração dos campos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const saveFieldsConfig = async (fieldsToSave: FormField[]) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'form_fields_config',
          value: fieldsToSave as unknown as any,
          description: 'Configuração dos campos do formulário público'
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const loadAllFields = async () => {
    if (!confirm('Isso irá substituir a configuração atual por todos os campos disponíveis. Continuar?')) return;

    try {
      // Define todos os campos disponíveis
      const allFields: FormField[] = [
        // DADOS DO DENUNCIANTE
        { 
          id: '1', name: 'complainant_name', label: 'Nome do Denunciante', 
          type: 'text', required: true, visible: true, order_index: 1, section: 'complainant' 
        },
        { 
          id: '2', name: 'complainant_phone', label: 'Telefone', 
          type: 'tel', required: true, visible: true, order_index: 2, section: 'complainant' 
        },
        { 
          id: '3', name: 'complainant_type', label: 'Tipo do Denunciante', 
          type: 'select', options: ['Pessoa Física', 'Pessoa Jurídica'], 
          required: true, visible: true, order_index: 3, section: 'complainant' 
        },
        { 
          id: '4', name: 'complainant_address', label: 'Endereço do Denunciante', 
          type: 'text', required: true, visible: true, order_index: 4, section: 'complainant' 
        },
        { 
          id: '5', name: 'complainant_neighborhood', label: 'Bairro do Denunciante', 
          type: 'text', required: true, visible: true, order_index: 5, section: 'complainant' 
        },
        { 
          id: '6', name: 'complainant_number', label: 'Número (Denunciante)', 
          type: 'text', required: false, visible: true, order_index: 6, section: 'complainant' 
        },
        { 
          id: '7', name: 'complainant_block', label: 'Quadra (Denunciante)', 
          type: 'text', required: false, visible: false, order_index: 7, section: 'complainant' 
        },
        { 
          id: '8', name: 'complainant_lot', label: 'Lote (Denunciante)', 
          type: 'text', required: false, visible: false, order_index: 8, section: 'complainant' 
        },
        
        // DADOS DA OCORRÊNCIA  
        { 
          id: '9', name: 'occurrence_type', label: 'Tipo de Ocorrência', 
          type: 'select', options: [
            'Som Alto', 'Música Alta', 'Festa', 'Construção Civil', 
            'Comércio Irregular', 'Estacionamento Irregular', 
            'Lixo em Local Inadequado', 'Poluição Sonora', 'Outros'
          ], 
          required: true, visible: true, order_index: 1, section: 'occurrence' 
        },
        { 
          id: '10', name: 'occurrence_address', label: 'Endereço da Ocorrência', 
          type: 'text', required: true, visible: true, order_index: 2, section: 'occurrence' 
        },
        { 
          id: '11', name: 'occurrence_neighborhood', label: 'Bairro da Ocorrência', 
          type: 'text', required: true, visible: true, order_index: 3, section: 'occurrence' 
        },
        { 
          id: '12', name: 'occurrence_number', label: 'Número (Ocorrência)', 
          type: 'text', required: false, visible: true, order_index: 4, section: 'occurrence' 
        },
        { 
          id: '13', name: 'occurrence_block', label: 'Quadra (Ocorrência)', 
          type: 'text', required: false, visible: false, order_index: 5, section: 'occurrence' 
        },
        { 
          id: '14', name: 'occurrence_lot', label: 'Lote (Ocorrência)', 
          type: 'text', required: false, visible: false, order_index: 6, section: 'occurrence' 
        },
        { 
          id: '15', name: 'occurrence_reference', label: 'Ponto de Referência', 
          type: 'text', required: false, visible: true, order_index: 7, section: 'occurrence' 
        },
        { 
          id: '16', name: 'occurrence_date', label: 'Data da Ocorrência', 
          type: 'date', required: true, visible: true, order_index: 8, section: 'occurrence' 
        },
        { 
          id: '17', name: 'occurrence_time', label: 'Horário da Ocorrência', 
          type: 'time', required: true, visible: true, order_index: 9, section: 'occurrence' 
        },
        
        // DADOS DA DENÚNCIA
        { 
          id: '18', name: 'narrative', label: 'Narrativa da Denúncia', 
          type: 'textarea', required: true, visible: true, order_index: 1, section: 'complaint' 
        },
        { 
          id: '19', name: 'classification', label: 'Classificação', 
          type: 'select', options: [
            'Urgente', 'Normal', 'Baixa Prioridade'
          ], 
          required: true, visible: true, order_index: 2, section: 'complaint' 
        }
      ];

      await saveFieldsConfig(allFields);
      setFields(allFields);

      toast({
        title: "Sucesso",
        description: `Todos os ${allFields.length} campos foram carregados com sucesso!`,
      });
    } catch (error: any) {
      console.error('Erro ao carregar todos os campos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar todos os campos",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newField: FormField = {
        id: editingField?.id || Date.now().toString(),
        name: formData.name,
        label: formData.label,
        type: formData.type,
        options: formData.options ? formData.options.split(',').map(opt => opt.trim()) : undefined,
        required: formData.required,
        visible: formData.visible,
        order_index: editingField?.order_index || Math.max(...fields.map(f => f.order_index), 0) + 1,
        section: formData.section
      };

      let updatedFields;
      if (editingField) {
        updatedFields = fields.map(field => 
          field.id === editingField.id ? newField : field
        );
      } else {
        updatedFields = [...fields, newField];
      }

      await saveFieldsConfig(updatedFields);
      setFields(updatedFields);
      
      setDialogOpen(false);
      setEditingField(null);
      setFormData({
        name: '',
        label: '',
        type: 'text',
        options: '',
        required: true,
        visible: true,
        section: 'complainant'
      });

      toast({
        title: "Sucesso",
        description: editingField ? "Campo atualizado com sucesso!" : "Campo criado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao salvar campo:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar campo",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (field: FormField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      type: field.type,
      options: field.options?.join(', ') || '',
      required: field.required,
      visible: field.visible,
      section: field.section
    });
    setDialogOpen(true);
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return;

    try {
      const updatedFields = fields.filter(field => field.id !== fieldId);
      await saveFieldsConfig(updatedFields);
      setFields(updatedFields);

      toast({
        title: "Sucesso",
        description: "Campo excluído com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao excluir campo:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir campo",
        variant: "destructive",
      });
    }
  };

  const toggleFieldVisibility = async (fieldId: string, visible: boolean) => {
    try {
      const updatedFields = fields.map(field => 
        field.id === fieldId ? { ...field, visible: !visible } : field
      );
      await saveFieldsConfig(updatedFields);
      setFields(updatedFields);

      toast({
        title: "Sucesso",
        description: `Campo ${!visible ? 'mostrado' : 'ocultado'} com sucesso!`,
      });
    } catch (error: any) {
      console.error('Erro ao alterar visibilidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar visibilidade do campo",
        variant: "destructive",
      });
    }
  };

  const getSectionBadge = (section: string) => {
    const colors = {
      complainant: 'bg-blue-500',
      occurrence: 'bg-green-500',
      complaint: 'bg-purple-500'
    };
    
    const labels = {
      complainant: 'Denunciante',
      occurrence: 'Ocorrência',
      complaint: 'Denúncia'
    };

    return (
      <Badge className={`${colors[section as keyof typeof colors]} text-white`}>
        {labels[section as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return <div>Carregando configuração dos campos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Campos do Formulário ({fields.length} campos)</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadAllFields}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Carregar Todos os Campos
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingField(null);
                setFormData({
                  name: '',
                  label: '',
                  type: 'text',
                  options: '',
                  required: true,
                  visible: true,
                  section: 'complainant'
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Campo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingField ? 'Editar Campo' : 'Novo Campo'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Campo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: telefone_emergencia"
                    required
                  />
                  <p className="text-sm text-gray-500">Nome técnico do campo (sem espaços)</p>
                </div>
                
                <div>
                  <Label htmlFor="label">Rótulo do Campo</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="ex: Telefone de Emergência"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo do Campo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: FormField['type']) => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="textarea">Área de Texto</SelectItem>
                      <SelectItem value="select">Lista de Seleção</SelectItem>
                      <SelectItem value="tel">Telefone</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="time">Hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.type === 'select' && (
                  <div>
                    <Label htmlFor="options">Opções (separadas por vírgula)</Label>
                    <Input
                      id="options"
                      value={formData.options}
                      onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                      placeholder="Opção 1, Opção 2, Opção 3"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="section">Seção</Label>
                  <Select 
                    value={formData.section} 
                    onValueChange={(value: FormField['section']) => 
                      setFormData(prev => ({ ...prev, section: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complainant">Dados do Denunciante</SelectItem>
                      <SelectItem value="occurrence">Dados da Ocorrência</SelectItem>
                      <SelectItem value="complaint">Dados da Denúncia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="required"
                      checked={formData.required}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, required: checked }))
                      }
                    />
                    <Label htmlFor="required">Campo Obrigatório</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="visible"
                      checked={formData.visible}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, visible: checked }))
                      }
                    />
                    <Label htmlFor="visible">Campo Visível</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingField ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Nome Técnico</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Seção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields
                .sort((a, b) => a.section.localeCompare(b.section) || a.order_index - b.order_index)
                .map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell className="font-mono text-sm">{field.name}</TableCell>
                  <TableCell>{field.type}</TableCell>
                  <TableCell>{getSectionBadge(field.section)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Badge variant={field.visible ? "default" : "secondary"}>
                        {field.visible ? 'Visível' : 'Oculto'}
                      </Badge>
                      {field.required && (
                        <Badge variant="destructive">Obrigatório</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(field)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={field.visible ? "secondary" : "default"}
                        onClick={() => toggleFieldVisibility(field.id, field.visible)}
                      >
                        {field.visible ? 'Ocultar' : 'Mostrar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum campo configurado. Clique em "Carregar Todos os Campos" para começar.
        </div>
      )}
    </div>
  );
};