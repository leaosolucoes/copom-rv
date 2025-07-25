import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AttendantComplaintFormProps {
  onSuccess?: () => void;
}

interface FormData {
  complainant_name: string;
  complainant_phone: string;
  complainant_type: string;
  complainant_address: string;
  complainant_number: string;
  complainant_block: string;
  complainant_lot: string;
  complainant_neighborhood: string;
  occurrence_type: string;
  occurrence_address: string;
  occurrence_number: string;
  occurrence_block: string;
  occurrence_lot: string;
  occurrence_neighborhood: string;
  occurrence_reference: string;
  occurrence_date: string;
  occurrence_time: string;
  narrative: string;
  classification: string;
  rural_zone: boolean;
}

interface FormField {
  name: string;
  type: string;
  section: string;
  visible: boolean;
  required: boolean;
  order: number;
}

interface SystemSettings {
  occurrence_types: string[];
  neighborhoods: string[];
  complainant_types: string[];
  classifications: string[];
  form_fields_config: FormField[];
}

export function AttendantComplaintForm({ onSuccess }: AttendantComplaintFormProps) {
  const [formData, setFormData] = useState<FormData>({
    complainant_name: '',
    complainant_phone: '',
    complainant_type: '',
    complainant_address: '',
    complainant_number: '',
    complainant_block: '',
    complainant_lot: '',
    complainant_neighborhood: '',
    occurrence_type: '',
    occurrence_address: '',
    occurrence_number: '',
    occurrence_block: '',
    occurrence_lot: '',
    occurrence_neighborhood: '',
    occurrence_reference: '',
    occurrence_date: '',
    occurrence_time: '',
    narrative: '',
    classification: '',
    rural_zone: false,
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    occurrence_types: [],
    neighborhoods: [],
    complainant_types: [],
    classifications: [],
    form_fields_config: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'occurrence_types',
          'neighborhoods',
          'complainant_types',
          'classifications',
          'form_fields_config'
        ]);

      if (error) throw error;

      const settings: SystemSettings = {
        occurrence_types: [],
        neighborhoods: [],
        complainant_types: [],
        classifications: [],
        form_fields_config: [],
      };

      data?.forEach(setting => {
        const key = setting.key as keyof SystemSettings;
        settings[key] = setting.value as any;
      });

      setSystemSettings(settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do sistema.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    const visibleFields = systemSettings.form_fields_config?.filter(field => field.visible) || [];
    
    for (const field of visibleFields) {
      if (field.required) {
        const value = formData[field.name as keyof FormData];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          toast({
            title: "Campo obrigatório",
            description: `O campo ${field.name.replace('_', ' ')} é obrigatório.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const complaintData = {
        ...formData,
        user_device_type: 'registro feito por ligação telefônica',
        user_browser: 'Sistema Interno - Atendimento',
        user_ip: null,
        user_location: null,
        user_agent: 'Sistema Interno - Registro por Ligação',
        photos: [],
        videos: [],
      };

      const { error } = await supabase
        .from('complaints')
        .insert([complaintData]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Denúncia registrada com sucesso.",
      });

      // Reset form
      setFormData({
        complainant_name: '',
        complainant_phone: '',
        complainant_type: '',
        complainant_address: '',
        complainant_number: '',
        complainant_block: '',
        complainant_lot: '',
        complainant_neighborhood: '',
        occurrence_type: '',
        occurrence_address: '',
        occurrence_number: '',
        occurrence_block: '',
        occurrence_lot: '',
        occurrence_neighborhood: '',
        occurrence_reference: '',
        occurrence_date: '',
        occurrence_time: '',
        narrative: '',
        classification: '',
        rural_zone: false,
      });

      // Close modal if callback provided
      onSuccess?.();

    } catch (error) {
      console.error('Erro ao enviar denúncia:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar denúncia. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldOptions = (field: FormField): string[] => {
    switch (field.name) {
      case 'occurrence_type':
        return systemSettings.occurrence_types || [];
      case 'complainant_neighborhood':
      case 'occurrence_neighborhood':
        return systemSettings.neighborhoods || [];
      case 'complainant_type':
        return systemSettings.complainant_types || [];
      case 'classification':
        return systemSettings.classifications || [];
      default:
        return [];
    }
  };

  // Mapeamento de labels amigáveis conforme formulário público
  const getFieldLabel = (fieldName: string): string => {
    const labelMap: Record<string, string> = {
      complainant_name: 'Nome do Denunciante',
      complainant_phone: 'Telefone do Denunciante',
      complainant_type: 'Tipo do Denunciante',
      complainant_address: 'Endereço do Denunciante',
      complainant_number: 'Número do Denunciante',
      complainant_block: 'Quadra do Denunciante',
      complainant_lot: 'Lote do Denunciante',
      complainant_neighborhood: 'Bairro do Denunciante',
      occurrence_type: 'Tipo de Ocorrência',
      occurrence_address: 'Endereço da Ocorrência',
      occurrence_number: 'Número da Ocorrência',
      occurrence_block: 'Quadra da Ocorrência',
      occurrence_lot: 'Lote da Ocorrência',
      occurrence_neighborhood: 'Bairro da Ocorrência',
      occurrence_reference: 'Ponto de Referência',
      occurrence_date: 'Data da Ocorrência',
      occurrence_time: 'Horário da Ocorrência',
      narrative: 'Relato da Ocorrência',
      classification: 'Classificação',
    };
    
    return labelMap[fieldName] || fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderField = (field: FormField) => {
    if (!field.visible) return null;

    const value = formData[field.name as keyof FormData];
    const options = getFieldOptions(field);
    const fieldLabel = getFieldLabel(field.name);

    if (options.length > 0) {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {fieldLabel}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select value={value as string} onValueChange={(val) => handleInputChange(field.name as keyof FormData, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${fieldLabel.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {fieldLabel}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field.name}
            value={value as string}
            onChange={(e) => handleInputChange(field.name as keyof FormData, e.target.value)}
            placeholder={`Digite ${fieldLabel.toLowerCase()}`}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {fieldLabel}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
          value={value as string}
          onChange={(e) => handleInputChange(field.name as keyof FormData, e.target.value)}
          placeholder={`Digite ${fieldLabel.toLowerCase()}`}
        />
      </div>
    );
  };

  const renderSection = (sectionType: 'complainant' | 'occurrence' | 'complaint', title: string) => {
    const sectionFields = systemSettings.form_fields_config
      ?.filter(field => field.section === sectionType && field.visible)
      ?.sort((a, b) => a.order - b.order) || [];

    if (sectionFields.length === 0) return null;

    return (
      <Card key={sectionType}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sectionFields.map(renderField)}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando formulário...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderSection('complainant', 'Dados do Denunciante')}
      {renderSection('occurrence', 'Dados da Ocorrência')}
      {renderSection('complaint', 'Detalhes da Denúncia')}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="rural_zone"
          checked={formData.rural_zone}
          onCheckedChange={(checked) => handleInputChange('rural_zone', !!checked)}
        />
        <Label htmlFor="rural_zone">Zona rural</Label>
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enviando...
            </>
          ) : (
            'Registrar Denúncia'
          )}
        </Button>
      </div>
    </form>
  );
}