import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Car, Camera } from "lucide-react";
import { format } from "date-fns";

interface Imprevisto {
  id: string;
  escala_id: string;
  motorista_id: string;
  descricao_imprevisto: string;
  fotos: string[] | null;
  created_at: string;
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
  if (!imprevisto) return null;

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
                  <div key={index} className="relative group">
                    <img
                      src={foto}
                      alt={`Foto ${index + 1} do imprevisto`}
                      className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(foto, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-md transition-all duration-200 flex items-center justify-center">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Clique para ampliar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant="destructive">Imprevisto Relatado</Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};