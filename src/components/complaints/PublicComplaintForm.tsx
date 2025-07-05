import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle } from "lucide-react";

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

interface SystemSettings {
  public_neighborhoods: string[];
  public_complaint_types: string[];
  public_occurrence_types: string[];
  public_classifications: string[];
}

export const PublicComplaintForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    public_neighborhoods: [],
    public_complaint_types: [],
    public_occurrence_types: [],
    public_classifications: []
  });

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

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'public_neighborhoods',
          'public_complaint_types',
          'public_occurrence_types',
          'public_classifications'
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

      data.forEach(item => {
        const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
        settingsObj[item.key as keyof SystemSettings] = value;
      });

      setSettings(settingsObj);
    } catch (error) {
      console.error('Erro ao processar configurações:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    const requiredFields: (keyof FormData)[] = [
      'complainant_name', 'complainant_phone', 'complainant_type', 
      'complainant_address', 'complainant_neighborhood',
      'occurrence_type', 'occurrence_address', 'occurrence_neighborhood',
      'narrative', 'occurrence_date', 'occurrence_time', 'classification'
    ];

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        toast({
          title: "Campo obrigatório",
          description: `Por favor, preencha o campo obrigatório.`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('complaints')
        .insert([formData]);

      if (error) {
        throw error;
      }

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
          <CardTitle className="flex items-center gap-2 text-primary">
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
        {/* Dados do Reclamante */}
        <Card className="shadow-form">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Reclamante</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="complainant_name">Nome Completo *</Label>
              <Input
                id="complainant_name"
                value={formData.complainant_name}
                onChange={(e) => handleInputChange('complainant_name', e.target.value)}
                placeholder="Digite seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_phone">Telefone *</Label>
              <Input
                id="complainant_phone"
                value={formData.complainant_phone}
                onChange={(e) => handleInputChange('complainant_phone', e.target.value)}
                placeholder="(xx) xxxxx-xxxx"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_type">Tipo *</Label>
              <Select value={formData.complainant_type} onValueChange={(value) => handleInputChange('complainant_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {settings.public_complaint_types.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_neighborhood">Bairro *</Label>
              <Select value={formData.complainant_neighborhood} onValueChange={(value) => handleInputChange('complainant_neighborhood', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bairro" />
                </SelectTrigger>
                <SelectContent>
                  {settings.public_neighborhoods.map((neighborhood) => (
                    <SelectItem key={neighborhood} value={neighborhood}>{neighborhood}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_address">Rua/Logradouro *</Label>
              <Input
                id="complainant_address"
                value={formData.complainant_address}
                onChange={(e) => handleInputChange('complainant_address', e.target.value)}
                placeholder="Digite o endereço"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_number">Número</Label>
              <Input
                id="complainant_number"
                value={formData.complainant_number}
                onChange={(e) => handleInputChange('complainant_number', e.target.value)}
                placeholder="Número"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_block">Quadra</Label>
              <Input
                id="complainant_block"
                value={formData.complainant_block}
                onChange={(e) => handleInputChange('complainant_block', e.target.value)}
                placeholder="Quadra"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complainant_lot">Lote</Label>
              <Input
                id="complainant_lot"
                value={formData.complainant_lot}
                onChange={(e) => handleInputChange('complainant_lot', e.target.value)}
                placeholder="Lote"
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço da Ocorrência */}
        <Card className="shadow-form">
          <CardHeader>
            <CardTitle className="text-lg">Endereço da Ocorrência</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occurrence_type">Tipo *</Label>
              <Select value={formData.occurrence_type} onValueChange={(value) => handleInputChange('occurrence_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {settings.public_occurrence_types.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurrence_neighborhood">Bairro *</Label>
              <Select value={formData.occurrence_neighborhood} onValueChange={(value) => handleInputChange('occurrence_neighborhood', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bairro" />
                </SelectTrigger>
                <SelectContent>
                  {settings.public_neighborhoods.map((neighborhood) => (
                    <SelectItem key={neighborhood} value={neighborhood}>{neighborhood}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurrence_address">Rua/Logradouro *</Label>
              <Input
                id="occurrence_address"
                value={formData.occurrence_address}
                onChange={(e) => handleInputChange('occurrence_address', e.target.value)}
                placeholder="Digite o endereço da ocorrência"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurrence_number">Número</Label>
              <Input
                id="occurrence_number"
                value={formData.occurrence_number}
                onChange={(e) => handleInputChange('occurrence_number', e.target.value)}
                placeholder="Número"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurrence_block">Quadra</Label>
              <Input
                id="occurrence_block"
                value={formData.occurrence_block}
                onChange={(e) => handleInputChange('occurrence_block', e.target.value)}
                placeholder="Quadra"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurrence_lot">Lote</Label>
              <Input
                id="occurrence_lot"
                value={formData.occurrence_lot}
                onChange={(e) => handleInputChange('occurrence_lot', e.target.value)}
                placeholder="Lote"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="occurrence_reference">Ponto de Referência</Label>
              <Input
                id="occurrence_reference"
                value={formData.occurrence_reference}
                onChange={(e) => handleInputChange('occurrence_reference', e.target.value)}
                placeholder="Próximo a algum estabelecimento conhecido..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados da Reclamação */}
        <Card className="shadow-form">
          <CardHeader>
            <CardTitle className="text-lg">Dados da Reclamação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="narrative">Narrativa *</Label>
              <Textarea
                id="narrative"
                value={formData.narrative}
                onChange={(e) => handleInputChange('narrative', e.target.value)}
                placeholder="Descreva detalhadamente a situação..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occurrence_date">Data da Ocorrência *</Label>
                <Input
                  id="occurrence_date"
                  type="date"
                  value={formData.occurrence_date}
                  onChange={(e) => handleInputChange('occurrence_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occurrence_time">Horário *</Label>
                <Input
                  id="occurrence_time"
                  type="time"
                  value={formData.occurrence_time}
                  onChange={(e) => handleInputChange('occurrence_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classification">Classificação *</Label>
                <Select value={formData.classification} onValueChange={(value) => handleInputChange('classification', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.public_classifications.map((classification) => (
                      <SelectItem key={classification} value={classification}>{classification}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_to">Atribuir para</Label>
                <Input
                  id="assigned_to"
                  value={formData.assigned_to}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                  placeholder="Setor responsável (opcional)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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