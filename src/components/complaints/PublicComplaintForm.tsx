import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle, Upload, X, Image, Video } from "lucide-react";

interface FormData {
  // Dados do reclamante
  complainant_name: string;
  complainant_phone: string;
  complainant_type: string;
  complainant_address: string;
  complainant_number: string;
  complainant_block: string;
  complainant_lot: string;
  complainant_neighborhood: string;
  
  // Endereço da ocorrência
  occurrence_type: string;
  occurrence_address: string;
  occurrence_number: string;
  occurrence_block: string;
  occurrence_lot: string;
  occurrence_neighborhood: string;
  occurrence_reference: string;
  
  // Dados da reclamação
  narrative: string;
  occurrence_date: string;
  occurrence_time: string;
  classification: string;
  assigned_to: string;
}

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

interface SystemSettings {
  public_neighborhoods: string[];
  public_complaint_types: string[];
  public_occurrence_types: string[];
  public_classifications: string[];
}

export const PublicComplaintForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [settings, setSettings] = useState<SystemSettings>({
    public_neighborhoods: [],
    public_complaint_types: [],
    public_occurrence_types: [],
    public_classifications: []
  });
  const [fieldConfig, setFieldConfig] = useState<FormField[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    complainant_name: "",
    complainant_phone: "",
    complainant_type: "",
    complainant_address: "",
    complainant_number: "",
    complainant_block: "",
    complainant_lot: "",
    complainant_neighborhood: "",
    occurrence_type: "",
    occurrence_address: "",
    occurrence_number: "",
    occurrence_block: "",
    occurrence_lot: "",
    occurrence_neighborhood: "",
    occurrence_reference: "",
    narrative: "",
    occurrence_date: "",
    occurrence_time: "",
    classification: "",
    assigned_to: ""
  });

  useEffect(() => {
    loadSystemSettings();
  }, []);

  // Adicionar efeito para recarregar quando houver mudanças nos tipos
  useEffect(() => {
    console.log('📊 Settings atualizados:', settings);
  }, [settings]);

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'public_neighborhoods',
          'public_complaint_types',
          'public_occurrence_types',
          'public_classifications',
          'form_fields_config',
          'public_logo_url'
        ]);

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      const settingsObj: SystemSettings = {
        public_neighborhoods: [],
        public_complaint_types: [],
        public_occurrence_types: [],
        public_classifications: []
      };

      let fieldsConfig: FormField[] = [];

      data.forEach(item => {
        if (item.key === 'form_fields_config') {
          fieldsConfig = (item.value as unknown as FormField[]) || [];
        } else if (item.key === 'public_logo_url') {
          setLogoUrl(item.value as string);
        } else {
          const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          settingsObj[item.key as keyof SystemSettings] = value;
          
          // Debug: Log para verificar os tipos de ocorrência carregados
          if (item.key === 'public_occurrence_types') {
            console.log('🔍 Tipos de ocorrência carregados do banco:', value);
          }
        }
      });

      setSettings(settingsObj);
      setFieldConfig(fieldsConfig);
    } catch (error) {
      console.error('Erro ao processar configurações:', error);
    }
  };

  const handleFileUpload = async (files: FileList, type: 'photo' | 'video') => {
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validar tipo de arquivo
        const isPhoto = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (type === 'photo' && !isPhoto) {
          throw new Error('Por favor, selecione apenas arquivos de imagem');
        }
        
        if (type === 'video' && !isVideo) {
          throw new Error('Por favor, selecione apenas arquivos de vídeo');
        }

        // Validar tamanho do arquivo
        const maxSize = type === 'photo' ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB para fotos, 50MB para vídeos
        if (file.size > maxSize) {
          throw new Error(`Arquivo muito grande. Tamanho máximo: ${type === 'photo' ? '5MB' : '50MB'}`);
        }

        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileExt = file.name.split('.').pop();
        const fileName = `${type}-${timestamp}-${randomStr}.${fileExt}`;

        // Upload para o Supabase Storage
        const { data, error } = await supabase.storage
          .from('complaint-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('complaint-media')
          .getPublicUrl(data.path);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      
      if (type === 'photo') {
        setUploadedPhotos(prev => [...prev, ...urls]);
      } else {
        setUploadedVideos(prev => [...prev, ...urls]);
      }

      toast({
        title: "Upload realizado com sucesso!",
        description: `${urls.length} arquivo(s) ${type === 'photo' ? 'de imagem' : 'de vídeo'} enviado(s).`,
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao fazer upload do arquivo",
        variant: "destructive",
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (url: string, type: 'photo' | 'video') => {
    if (type === 'photo') {
      setUploadedPhotos(prev => prev.filter(photo => photo !== url));
    } else {
      setUploadedVideos(prev => prev.filter(video => video !== url));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    console.log('Iniciando validação do formulário...');
    console.log('Configuração dos campos:', fieldConfig);
    console.log('Dados do formulário:', formData);
    
    // Validar apenas campos obrigatórios que estão visíveis
    const requiredVisibleFields = fieldConfig.filter(field => field.required && field.visible);
    console.log('Campos obrigatórios visíveis:', requiredVisibleFields);
    
    for (const field of requiredVisibleFields) {
      const fieldValue = formData[field.name as keyof FormData];
      console.log(`Validando campo ${field.name}:`, fieldValue);
      
      if (!fieldValue || fieldValue.toString().trim() === '') {
        console.log(`Campo ${field.name} está vazio!`);
        toast({
          title: "Campo obrigatório",
          description: `Por favor, preencha o campo "${field.label}".`,
          variant: "destructive"
        });
        return false;
      }
    }
    console.log('Todos os campos obrigatórios foram preenchidos');
    return true;
  };

  const getFieldOptions = (field: FormField): string[] => {
    // Para campos que têm opções configuradas
    if (field.options && field.options.length > 0) {
      return field.options;
    }
    
    // Para campos que dependem das configurações do sistema
    switch (field.name) {
      case 'complainant_type':
        return settings.public_complaint_types;
      case 'complainant_neighborhood':
      case 'occurrence_neighborhood':
        return settings.public_neighborhoods;
      case 'occurrence_type':
        console.log('🔍 getFieldOptions chamado para occurrence_type');
        console.log('📊 settings.public_occurrence_types:', settings.public_occurrence_types);
        
        // Filtrar apenas tipos visíveis
        if (Array.isArray(settings.public_occurrence_types) && settings.public_occurrence_types.length > 0) {
          try {
            // Verificar se está no novo formato (objetos com name e visible)
            const hasNewFormat = settings.public_occurrence_types.some((item: any) => 
              item && typeof item === 'object' && 'name' in item && 'visible' in item
            );
            
            console.log('🔄 hasNewFormat:', hasNewFormat);
            
            if (hasNewFormat) {
              // Novo formato com objetos
              const visibleTypes = settings.public_occurrence_types
                .filter((type: any) => type && type.visible)
                .map((type: any) => type.name);
              console.log('✅ Tipos visíveis (novo formato):', visibleTypes);
              return visibleTypes;
            }
          } catch (e) {
            console.log('❌ Erro ao processar novo formato:', e);
            // Em caso de erro, usar formato antigo
          }
          // Formato antigo com strings (compatibilidade)
          console.log('📱 Usando formato antigo (strings):', settings.public_occurrence_types);
          return settings.public_occurrence_types as string[];
        }
        console.log('⚠️ Nenhum tipo de ocorrência encontrado, retornando array vazio');
        return [];
      case 'classification':
        return settings.public_classifications;
      default:
        return [];
    }
  };

  const renderField = (field: FormField) => {
    if (!field.visible) return null;

    const fieldValue = formData[field.name as keyof FormData] || '';
    const isRequired = field.required;
    const label = `${field.label}${isRequired ? ' *' : ''}`;

    switch (field.type) {
      case 'text':
      case 'tel':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <Input
              id={field.name}
              type={field.type === 'tel' ? 'tel' : 'text'}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.name as keyof FormData, e.target.value)}
              placeholder={field.type === 'tel' ? '(xx) xxxxx-xxxx' : `Digite ${field.label.toLowerCase()}`}
              required={isRequired}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <Textarea
              id={field.name}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.name as keyof FormData, e.target.value)}
              placeholder={`Digite ${field.label.toLowerCase()}...`}
              rows={4}
              required={isRequired}
            />
          </div>
        );

      case 'select':
        const options = getFieldOptions(field);
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <Select 
              value={fieldValue} 
              onValueChange={(value) => handleInputChange(field.name as keyof FormData, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <Input
              id={field.name}
              type="date"
              value={fieldValue}
              onChange={(e) => handleInputChange(field.name as keyof FormData, e.target.value)}
              required={isRequired}
            />
          </div>
        );

      case 'time':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <Input
              id={field.name}
              type="time"
              value={fieldValue}
              onChange={(e) => handleInputChange(field.name as keyof FormData, e.target.value)}
              required={isRequired}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderSection = (sectionType: 'complainant' | 'occurrence' | 'complaint', title: string) => {
    const sectionFields = fieldConfig
      .filter(field => field.section === sectionType && field.visible)
      .sort((a, b) => a.order_index - b.order_index);

    if (sectionFields.length === 0) return null;

    return (
      <Card key={sectionType} className="shadow-form">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionFields.map(field => {
            const renderedField = renderField(field);
            // Para campos de narrativa (textarea), ocupar toda a largura
            if (field.type === 'textarea' || field.name === 'occurrence_reference') {
              return (
                <div key={field.id} className="md:col-span-2">
                  {renderedField}
                </div>
              );
            }
            return renderedField;
          })}

          {/* Campos de mídia apenas na seção de reclamação */}
          {sectionType === 'complaint' && (
            <>
              {/* Campo de upload de fotos */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Adicionar Fotos (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'photo')}
                      disabled={uploadingMedia}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">Máx: 5MB cada</span>
                  </div>
                  
                  {/* Preview das fotos */}
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo} 
                            alt={`Foto ${index + 1}`} 
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeMedia(photo, 'photo')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campo de upload de vídeos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Adicionar Vídeos (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'video')}
                      disabled={uploadingMedia}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">Máx: 50MB cada</span>
                  </div>
                  
                  {/* Preview dos vídeos */}
                  {uploadedVideos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {uploadedVideos.map((video, index) => (
                        <div key={index} className="relative group">
                          <video 
                            src={video} 
                            className="w-full h-32 object-cover rounded border"
                            controls
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeMedia(video, 'video')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {uploadingMedia && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Fazendo upload...
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Formulário submetido!');
    console.log('📋 Estado atual do formData:', formData);
    console.log('⚙️ Configuração dos campos:', fieldConfig);
    
    if (!validateForm()) {
      console.log('❌ Validação falhou, formulário não será enviado');
      return;
    }
    
    console.log('✅ Validação passou, iniciando envio...');
    setIsSubmitting(true);

    try {
      // Preparar dados para inserção (incluindo mídias)
      const dataToInsert = {
        complainant_name: formData.complainant_name.trim(),
        complainant_phone: formData.complainant_phone.trim(),
        complainant_type: formData.complainant_type,
        complainant_address: formData.complainant_address.trim(),
        complainant_number: formData.complainant_number?.trim() || null,
        complainant_block: formData.complainant_block?.trim() || null,
        complainant_lot: formData.complainant_lot?.trim() || null,
        complainant_neighborhood: formData.complainant_neighborhood,
        occurrence_type: formData.occurrence_type,
        occurrence_address: formData.occurrence_address.trim(),
        occurrence_number: formData.occurrence_number?.trim() || null,
        occurrence_block: formData.occurrence_block?.trim() || null,
        occurrence_lot: formData.occurrence_lot?.trim() || null,
        occurrence_neighborhood: formData.occurrence_neighborhood,
        occurrence_reference: formData.occurrence_reference?.trim() || null,
        narrative: formData.narrative.trim(),
        occurrence_date: formData.occurrence_date || null,
        occurrence_time: formData.occurrence_time || null,
        classification: formData.classification,
        assigned_to: formData.assigned_to?.trim() || null,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
        videos: uploadedVideos.length > 0 ? uploadedVideos : null
      };
      
      console.log('🔄 Dados que serão enviados:', dataToInsert);
      console.log('📡 Fazendo requisição para Supabase...');
      
      const { data, error } = await supabase
        .from('complaints')
        .insert([dataToInsert])
        .select();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Denúncia enviada com sucesso!');
      toast({
        title: "Denúncia enviada com sucesso!",
        description: "Sua denúncia foi registrada e será analisada pela equipe responsável.",
        variant: "default"
      });

      // Reset form
      setFormData({
        complainant_name: "",
        complainant_phone: "",
        complainant_type: "",
        complainant_address: "",
        complainant_number: "",
        complainant_block: "",
        complainant_lot: "",
        complainant_neighborhood: "",
        occurrence_type: "",
        occurrence_address: "",
        occurrence_number: "",
        occurrence_block: "",
        occurrence_lot: "",
        occurrence_neighborhood: "",
        occurrence_reference: "",
        narrative: "",
        occurrence_date: "",
        occurrence_time: "",
        classification: "",
        assigned_to: ""
      });

      // Limpar uploads
      setUploadedPhotos([]);
      setUploadedVideos([]);

    } catch (error) {
      console.error('Erro ao enviar denúncia:', error);
      toast({
        title: "Erro ao enviar denúncia",
        description: "Ocorreu um erro ao processar sua denúncia. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Cabeçalho informativo */}
      <Card className="shadow-form border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary">
            {logoUrl && (
              <div className="flex items-center gap-2">
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-10 w-10 object-contain"
                />
                <span className="text-sm font-medium">Fiscalização de Posturas</span>
              </div>
            )}
            <AlertTriangle className="h-5 w-5" />
            Formulário de Denúncia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Preencha todos os campos obrigatórios para registrar sua denúncia de perturbação do sossego.
            Todas as informações serão tratadas com confidencialidade.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSection('complainant', 'Dados do Reclamante')}
        {renderSection('occurrence', 'Endereço da Ocorrência')}
        {renderSection('complaint', 'Dados da Reclamação')}

        {/* Botão de envio */}
        <Card className="shadow-form">
          <CardContent className="pt-6">
            <Button 
              type="submit" 
              variant="government" 
              size="lg" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Denúncia
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};