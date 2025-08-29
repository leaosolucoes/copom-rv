import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImprevistosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escalaId: string;
  viaturaPrefixo: string;
  onSuccess: () => void;
}

export const ImprevistosModal = ({
  open,
  onOpenChange,
  escalaId,
  viaturaPrefixo,
  onSuccess
}: ImprevistosModalProps) => {
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Aviso",
        description: "Apenas arquivos de imagem são permitidos",
        variant: "destructive",
      });
    }
    
    setFotos(prev => [...prev, ...imageFiles].slice(0, 5)); // Máximo 5 fotos
  };

  const removePhoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!descricao.trim()) {
      toast({
        title: "Erro",
        description: "Descreva o imprevisto ocorrido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Verificar se o usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let fotoUrls: string[] = [];

      // Upload das fotos se houver
      if (fotos.length > 0) {
        for (const foto of fotos) {
          const fileName = `imprevisto_${escalaId}_${Date.now()}_${foto.name}`;
          const { data, error } = await supabase.storage
            .from('complaint-media')
            .upload(`imprevistos/${fileName}`, foto);

          if (error) throw error;
          
          const { data: urlData } = supabase.storage
            .from('complaint-media')
            .getPublicUrl(data.path);
          
          fotoUrls.push(urlData.publicUrl);
        }
      }

      // Salvar o imprevisto
      const { error } = await supabase
        .from('escala_imprevistos')
        .insert([{
          escala_id: escalaId,
          motorista_id: user.id,
          descricao_imprevisto: descricao.trim(),
          fotos: fotoUrls.length > 0 ? fotoUrls : null
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Imprevisto relatado com sucesso. O administrador será notificado.",
        variant: "default",
      });

      setDescricao("");
      setFotos([]);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao relatar imprevisto:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao relatar imprevisto",
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
            <AlertTriangle className="h-5 w-5 text-warning" />
            Informar Imprevisto
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-lg mb-4">
          <p className="text-sm font-medium">Viatura: {viaturaPrefixo}</p>
          <p className="text-xs text-muted-foreground">
            Relate qualquer problema ou imprevisto ocorrido durante o serviço
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Imprevisto *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva detalhadamente o que aconteceu..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fotos">Fotos (Opcional - máx. 5)</Label>
            <Input
              id="fotos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={fotos.length >= 5}
            />
            
            {fotos.length > 0 && (
              <div className="space-y-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm truncate">{foto.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};