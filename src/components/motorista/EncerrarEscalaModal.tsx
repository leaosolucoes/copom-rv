import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EncerrarEscalaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escala: {
    id: string;
    km_inicial: number;
    viaturas: { prefixo: string; modelo: string } | null;
  };
  onSuccess: () => void;
}

export const EncerrarEscalaModal = ({
  open,
  onOpenChange,
  escala,
  onSuccess
}: EncerrarEscalaModalProps) => {
  const [kmFinal, setKmFinal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const kmFinalNum = parseInt(kmFinal);
    
    if (!kmFinal || kmFinalNum < escala.km_inicial) {
      toast({
        title: "Erro",
        description: "KM final deve ser maior que KM inicial",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('escalas_viaturas')
        .update({
          km_final: kmFinalNum,
          status: 'encerrada',
          encerrado_em: new Date().toISOString(),
          observacoes: observacoes.trim() || null
        })
        .eq('id', escala.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Escala encerrada com sucesso!",
        variant: "default",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao encerrar escala:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao encerrar escala",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StopCircle className="h-5 w-5 text-destructive" />
            Encerrar Escala
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-lg mb-4">
          <p className="text-sm font-medium">
            Viatura: {escala.viaturas?.prefixo} - {escala.viaturas?.modelo}
          </p>
          <p className="text-xs text-muted-foreground">
            KM Inicial: {escala.km_inicial.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Encerrando em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="km_final">KM Final *</Label>
            <Input
              id="km_final"
              type="number"
              min={escala.km_inicial + 1}
              placeholder={`Maior que ${escala.km_inicial}`}
              value={kmFinal}
              onChange={(e) => setKmFinal(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o serviço realizado..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-[80px]"
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
            <Button 
              type="submit" 
              variant="destructive"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Encerrando..." : "Encerrar Escala"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};