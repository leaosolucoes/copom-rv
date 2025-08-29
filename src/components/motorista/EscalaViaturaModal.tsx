import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Clock, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EscalaViaturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viaturaId: string;
  viaturaPrefixo: string;
  viaturaModelo: string;
  kmInicial: number;
  motoristaId: string;
  motoristaNome: string;
  onSuccess: () => void;
}

interface Fiscal {
  id: string;
  full_name: string;
}

interface EscalaData {
  viatura_id: string;
  motorista_id: string;
  fiscal_id: string | null;
  data_servico: string;
  hora_entrada: string;
  hora_saida: string;
  km_inicial: number;
  celular_funcional: string;
}

export const EscalaViaturaModal = ({
  open,
  onOpenChange,
  viaturaId,
  viaturaPrefixo,
  viaturaModelo,
  kmInicial,
  motoristaId,
  motoristaNome,
  onSuccess
}: EscalaViaturaModalProps) => {
  const [fiscais, setFiscais] = useState<Fiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [escalaData, setEscalaData] = useState<EscalaData>({
    viatura_id: viaturaId,
    motorista_id: motoristaId,
    fiscal_id: null,
    data_servico: format(new Date(), 'yyyy-MM-dd'),
    hora_entrada: format(new Date(), 'HH:mm'),
    hora_saida: '',
    km_inicial: kmInicial,
    celular_funcional: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchFiscais();
      setEscalaData({
        viatura_id: viaturaId,
        motorista_id: motoristaId,
        fiscal_id: null,
        data_servico: format(new Date(), 'yyyy-MM-dd'),
        hora_entrada: format(new Date(), 'HH:mm'),
        hora_saida: '',
        km_inicial: kmInicial,
        celular_funcional: ''
      });
    }
  }, [open, viaturaId, motoristaId, kmInicial]);

  const fetchFiscais = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .in('role', ['fiscal', 'admin'])
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setFiscais(data || []);
    } catch (error) {
      console.error('Erro ao buscar fiscais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de fiscais",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!escalaData.hora_entrada || !escalaData.hora_saida) {
      toast({
        title: "Erro",
        description: "Preencha os horários de entrada e saída",
        variant: "destructive",
      });
      return;
    }

    if (!escalaData.celular_funcional) {
      toast({
        title: "Erro",
        description: "Preencha o celular funcional",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmation(true);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (2 DDD + 9 número)
    const limitedDigits = digits.slice(0, 11);
    
    // Aplica a máscara (00) 99999-9999
    if (limitedDigits.length <= 2) {
      return limitedDigits;
    } else if (limitedDigits.length <= 7) {
      return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`;
    } else {
      return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 7)}-${limitedDigits.slice(7)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setEscalaData(prev => ({ ...prev, celular_funcional: formattedValue }));
  };

  const confirmarEscala = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('escalas_viaturas')
        .insert([escalaData]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Escala registrada com sucesso!",
        variant: "default",
      });

      onSuccess();
      onOpenChange(false);
      setShowConfirmation(false);
    } catch (error: any) {
      console.error('Erro ao salvar escala:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao registrar escala",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Escala</DialogTitle>
          </DialogHeader>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo da Escala</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span className="font-medium">{viaturaPrefixo}</span>
                <span className="text-muted-foreground">- {viaturaModelo}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>Motorista: {motoristaNome}</span>
              </div>
              
              {escalaData.fiscal_id && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Fiscal: {fiscais.find(f => f.id === escalaData.fiscal_id)?.full_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {format(new Date(escalaData.data_servico), 'dd/MM/yyyy')} - 
                  {escalaData.hora_entrada} às {escalaData.hora_saida}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>{escalaData.celular_funcional}</span>
              </div>
              
              <div>
                <span className="font-medium">KM Inicial: </span>
                <span>{escalaData.km_inicial.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)}
              className="flex-1"
            >
              Corrigir
            </Button>
            <Button 
              onClick={confirmarEscala}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escalar Viatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4 text-primary" />
              <span className="font-medium">{viaturaPrefixo} - {viaturaModelo}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm">Motorista: {motoristaNome}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_servico">Data do Serviço</Label>
              <Input
                id="data_servico"
                type="date"
                value={escalaData.data_servico}
                onChange={(e) => setEscalaData(prev => ({ ...prev, data_servico: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_inicial">KM Inicial</Label>
              <Input
                id="km_inicial"
                type="number"
                value={escalaData.km_inicial}
                onChange={(e) => setEscalaData(prev => ({ ...prev, km_inicial: Number(e.target.value) }))}
                required
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora_entrada">Hora de Entrada</Label>
              <Input
                id="hora_entrada"
                type="time"
                value={escalaData.hora_entrada}
                onChange={(e) => setEscalaData(prev => ({ ...prev, hora_entrada: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_saida">Hora de Saída</Label>
              <Input
                id="hora_saida"
                type="time"
                value={escalaData.hora_saida}
                onChange={(e) => setEscalaData(prev => ({ ...prev, hora_saida: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal_id">Fiscal (Opcional)</Label>
            <Select
              value={escalaData.fiscal_id || ""}
              onValueChange={(value) => setEscalaData(prev => ({ ...prev, fiscal_id: value || null }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fiscal" />
              </SelectTrigger>
              <SelectContent>
                {fiscais.map((fiscal) => (
                  <SelectItem key={fiscal.id} value={fiscal.id}>
                    {fiscal.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="celular_funcional">Celular Funcional</Label>
            <Input
              id="celular_funcional"
              type="tel"
              placeholder="(00) 99999-9999"
              value={escalaData.celular_funcional}
              onChange={handlePhoneChange}
              required
            />
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Escala
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};