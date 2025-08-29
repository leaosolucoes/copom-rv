import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Car, Camera, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { MediaModal } from "@/components/ui/media-modal";
import { useState } from "react";

interface Imprevisto {
  id: string;
  escala_id: string;
  motorista_id: string;
  descricao_imprevisto: string;
  fotos: string[] | null;
  created_at: string;
  admin_ciente: boolean;
  admin_ciente_por: string | null;
  admin_ciente_em: string | null;
  escalas_viaturas: {
    viaturas: { prefixo: string } | null;
    users: { full_name: string } | null;
  } | null;
}

interface DetalhesImprevistosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imprevisto: Imprevisto | null;
}

export const DetalhesImprevisto = ({
  open,
  onOpenChange,
  imprevisto
}: DetalhesImprevistosProps) => {
  const { profile } = useSupabaseAuth();
  const { toast } = useToast();
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!imprevisto) return null;

  const isAdminOrSuperAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const handleMarcarCiente = async () => {
    if (!profile?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('escala_imprevistos')
        .update({
          admin_ciente: true,
          admin_ciente_por: profile.id,
          admin_ciente_em: new Date().toISOString()
        })
        .eq('id', imprevisto.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Imprevisto marcado como ciente",
      });

      // Fechar modal após sucesso
      onOpenChange(false);
      
      // Recarregar a página para atualizar os dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao marcar como ciente:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar imprevisto como ciente",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Detalhes do Imprevisto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Car className="h-4 w-4" />
                Viatura
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {imprevisto.escalas_viaturas?.viaturas?.prefixo || 'N/A'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Motorista
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {imprevisto.escalas_viaturas?.users?.full_name || 'N/A'}
              </p>
            </div>

            <div className="space-y-2 col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Data e Horário
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {format(new Date(imprevisto.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Descrição do Imprevisto</h4>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">{imprevisto.descricao_imprevisto}</p>
            </div>
          </div>

          {/* Fotos */}
          {imprevisto.fotos && imprevisto.fotos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <h4 className="text-sm font-medium">
                  Fotos Anexadas ({imprevisto.fotos.length})
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {imprevisto.fotos.map((foto, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setShowImageModal(true);
                    }}
                  >
                    <img
                      src={foto}
                      alt={`Foto ${index + 1} do imprevisto`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-md transition-all duration-200 flex items-center justify-center pointer-events-none">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Clique para ampliar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status da Ciência do Admin */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status da Ciência:</span>
                {imprevisto.admin_ciente ? (
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Admin Ciente
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Aguardando Ciência do Admin
                  </Badge>
                )}
              </div>
              
              {!imprevisto.admin_ciente && isAdminOrSuperAdmin && (
                <Button 
                  onClick={handleMarcarCiente}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Marcar como Ciente
                </Button>
              )}
            </div>
            
            {imprevisto.admin_ciente && imprevisto.admin_ciente_em && (
              <div className="text-sm text-muted-foreground">
                Marcado como ciente em {format(new Date(imprevisto.admin_ciente_em), 'dd/MM/yyyy HH:mm')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Modal para ampliar imagens */}
      {imprevisto.fotos && imprevisto.fotos.length > 0 && (
        <MediaModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          media={imprevisto.fotos}
          initialIndex={selectedImageIndex}
          type="photo"
        />
      )}
    </Dialog>
  );
};