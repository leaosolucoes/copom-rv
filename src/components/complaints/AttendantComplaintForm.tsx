import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { offlineStorage } from "@/utils/offlineStorage";

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
  description: string;
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
  const { isOnline } = useNetworkStatus();
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
        description: '',
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
          'public_occurrence_types',
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
        
        // Para occurrence_types, usar public_occurrence_types se disponível
        if (setting.key === 'public_occurrence_types') {
          try {
            const value = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
            
            // Verificar se está no novo formato (objetos com name e visible)
            const hasNewFormat = Array.isArray(value) && value.some((item: any) => 
              item && typeof item === 'object' && 'name' in item && 'visible' in item
            );
            
            if (hasNewFormat) {
              // Novo formato com objetos - filtrar apenas tipos visíveis
              const visibleTypes = value
                .filter((type: any) => type && type.visible)
                .map((type: any) => type.name);
              settings.occurrence_types = visibleTypes;
            } else {
              // Formato antigo com strings
              settings.occurrence_types = value as string[];
            }
          } catch (e) {
            console.error('Erro ao processar public_occurrence_types:', e);
            settings.occurrence_types = [];
          }
        } else if (setting.key === 'occurrence_types' && settings.occurrence_types.length === 0) {
          // Fallback para occurrence_types se public_occurrence_types não estiver disponível
          settings[key] = setting.value as any;
        } else if (setting.key !== 'public_occurrence_types') {
          settings[key] = setting.value as any;
        }
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
    
    // Verificar se é zona rural através do campo complainant_type
    const isZonaRural = formData.complainant_type === 'Zona Rural';
    
    for (const field of visibleFields) {
      if (field.required) {
        // Se for zona rural, tornar opcionais os campos de bairro, quadra e número
        if (isZonaRural) {
          const optionalFieldsInRural = [
            'complainant_neighborhood', 'complainant_block', 'complainant_number',
            'occurrence_neighborhood', 'occurrence_block', 'occurrence_number'
          ];
          if (optionalFieldsInRural.includes(field.name)) {
            continue; // Pular validação deste campo em zona rural
          }
        }
        
        const value = formData[field.name as keyof FormData];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          toast({
            title: "Campo obrigatório",
            description: `O campo ${getFieldLabel(field.name)} é obrigatório.`,
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
    
    console.log('Form submitted');
    console.log('FormData:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsSubmitting(true);

    try {
      // Remove rural_zone from formData before sending
      const { rural_zone, ...cleanFormData } = formData;
      
      const complaintData = {
        complainant_name: formData.complainant_name,
        complainant_phone: formData.complainant_phone,
        complainant_type: formData.complainant_type,
        complainant_address: formData.complainant_address,
        complainant_number: formData.complainant_number || '',
        complainant_block: formData.complainant_block || '',
        complainant_lot: formData.complainant_lot || '',
        complainant_neighborhood: formData.complainant_neighborhood,
        occurrence_type: formData.occurrence_type,
        occurrence_address: formData.occurrence_address,
        occurrence_number: formData.occurrence_number || '',
        occurrence_block: formData.occurrence_block || '',
        occurrence_lot: formData.occurrence_lot || '',
        occurrence_neighborhood: formData.occurrence_neighborhood,
        occurrence_reference: formData.occurrence_reference || '',
        occurrence_date: formData.occurrence_date || null,
        occurrence_time: formData.occurrence_time || null,
        // Usar narrative se description estiver vazio (compatibilidade com config antiga)
        description: formData.description || formData.narrative || '',
        classification: formData.classification,
        user_device_type: 'registro feito por ligação telefônica',
        user_browser: 'Sistema Interno - Atendimento',
        user_agent: 'Sistema Interno - Registro por Ligação',
      };

      console.log('Complaint data to be sent:', complaintData);

      // Verificar se está offline
      if (!isOnline) {
        console.log('📴 Sem conexão, salvando denúncia offline...');
        
        const offlineComplaint = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: complaintData,
          photos: [],
          videos: [],
          retryCount: 0,
          status: 'pending' as const
        };
        
        await offlineStorage.saveComplaint(offlineComplaint);
        
        toast({
          title: "✅ Denúncia salva localmente",
          description: "Sem conexão! A denúncia será enviada automaticamente quando a internet voltar.",
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
          description: '',
          narrative: '',
          classification: '',
          rural_zone: false,
        });
        
        if (onSuccess) onSuccess();
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('complaints')
        .insert([complaintData])
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

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
        description: '',
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
        description: `Erro ao registrar denúncia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
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
        // Definir opções fixas para tipo de denunciante
        return ['Zona Urbana', 'Zona Rural'];
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
      description: 'Relato da Ocorrência',
      classification: 'Classificação',
    };
    
    return labelMap[fieldName] || fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderField = (field: FormField) => {
    if (!field.visible) return null;

    const value = formData[field.name as keyof FormData];
    const options = getFieldOptions(field);
    const fieldLabel = getFieldLabel(field.name);
    
    // Verificar se é zona rural através do campo complainant_type
    const isZonaRural = formData.complainant_type === 'Zona Rural';
    const optionalFieldsInRural = [
      'complainant_neighborhood', 'complainant_block', 'complainant_number',
      'occurrence_neighborhood', 'occurrence_block', 'occurrence_number'
    ];
    
    const isOptionalInRural = isZonaRural && optionalFieldsInRural.includes(field.name);
    const isRequired = field.required && !isOptionalInRural;
    
    // Mostrar indicação quando campo se torna opcional em zona rural
    const showOptionalText = !isZonaRural && optionalFieldsInRural.includes(field.name) && field.required;
    const label = `${fieldLabel}${isRequired ? ' *' : ''}${showOptionalText ? ' (opcional em zona rural)' : ''}`;

    // Campos de bairro sempre como input de texto livre
    const neighborhoodFields = ['complainant_neighborhood', 'occurrence_neighborhood'];
    const isNeighborhoodField = neighborhoodFields.includes(field.name);

    if (options.length > 0 && !isNeighborhoodField) {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
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
          <Label htmlFor={field.name}>{label}</Label>
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
        <Label htmlFor={field.name}>{label}</Label>
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