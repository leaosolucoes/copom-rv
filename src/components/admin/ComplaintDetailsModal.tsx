import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Hash,
  Building,
  Image as ImageIcon,
  Video
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComplaintDetails {
  id: string;
  protocol_number?: string;
  system_identifier?: string;
  complainant_name: string;
  complainant_phone: string;
  complainant_type?: string;
  complainant_address?: string;
  complainant_number?: string;
  complainant_complement?: string;
  complainant_neighborhood?: string;
  complainant_city?: string;
  complainant_state?: string;
  complainant_zip?: string;
  complainant_block?: string;
  complainant_lot?: string;
  occurrence_type: string;
  occurrence_date?: string;
  occurrence_time?: string;
  occurrence_address: string;
  occurrence_number?: string;
  occurrence_complement?: string;
  occurrence_neighborhood: string;
  occurrence_city?: string;
  occurrence_state?: string;
  occurrence_zip?: string;
  occurrence_reference?: string;
  occurrence_block?: string;
  occurrence_lot?: string;
  description: string;
  status: string;
  classification?: string;
  photos?: any;
  videos?: any;
  user_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  updated_at?: string;
  attendant_id?: string;
  user_device_type?: string;
  user_browser?: string;
  user_ip?: string;
}

interface ComplaintDetailsModalProps {
  complaint: ComplaintDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ComplaintDetailsModal = ({ complaint, open, onOpenChange }: ComplaintDetailsModalProps) => {
  if (!complaint) return null;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'nova':
        return 'bg-blue-500';
      case 'em_andamento':
        return 'bg-red-500';
      case 'processada':
        return 'bg-green-500';
      case 'arquivada':
        return 'bg-gray-500';
      default:
        return 'bg-purple-500';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'nova':
        return 'Nova';
      case 'em_andamento':
        return 'Em Andamento';
      case 'processada':
        return 'Processada';
      case 'arquivada':
        return 'Arquivada';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Protocolo #{complaint.protocol_number || complaint.system_identifier}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Status e Data */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(complaint.status)}>
                {getStatusText(complaint.status)}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(complaint.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>

            <Separator />

            {/* Dados do Denunciante */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Denunciante
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{complaint.complainant_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <p className="font-medium">{complaint.complainant_phone}</p>
                </div>
                {complaint.complainant_type && (
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{complaint.complainant_type}</p>
                  </div>
                )}
                {complaint.complainant_address && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Endereço:</span>
                    <p className="font-medium">
                      {complaint.complainant_address}
                      {complaint.complainant_number && `, ${complaint.complainant_number}`}
                      {complaint.complainant_complement && ` - ${complaint.complainant_complement}`}
                    </p>
                  </div>
                )}
                {complaint.complainant_neighborhood && (
                  <div>
                    <span className="text-muted-foreground">Bairro:</span>
                    <p className="font-medium">{complaint.complainant_neighborhood}</p>
                  </div>
                )}
                {(complaint.complainant_city || complaint.complainant_state) && (
                  <div>
                    <span className="text-muted-foreground">Cidade/Estado:</span>
                    <p className="font-medium">
                      {complaint.complainant_city}{complaint.complainant_state && `/${complaint.complainant_state}`}
                    </p>
                  </div>
                )}
                {complaint.complainant_zip && (
                  <div>
                    <span className="text-muted-foreground">CEP:</span>
                    <p className="font-medium">{complaint.complainant_zip}</p>
                  </div>
                )}
                {(complaint.complainant_block || complaint.complainant_lot) && (
                  <div>
                    <span className="text-muted-foreground">Quadra/Lote:</span>
                    <p className="font-medium">
                      {complaint.complainant_block && `Quadra ${complaint.complainant_block}`}
                      {complaint.complainant_lot && ` / Lote ${complaint.complainant_lot}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Dados da Ocorrência */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dados da Ocorrência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <span className="text-muted-foreground">Tipo de Ocorrência:</span>
                  <p className="font-medium">{complaint.occurrence_type}</p>
                </div>
                {complaint.occurrence_date && (
                  <div>
                    <span className="text-muted-foreground">Data da Ocorrência:</span>
                    <p className="font-medium">
                      {format(new Date(complaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {complaint.occurrence_time && (
                  <div>
                    <span className="text-muted-foreground">Hora da Ocorrência:</span>
                    <p className="font-medium">{complaint.occurrence_time}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground">Endereço:</span>
                  <p className="font-medium">
                    {complaint.occurrence_address}
                    {complaint.occurrence_number && `, ${complaint.occurrence_number}`}
                    {complaint.occurrence_complement && ` - ${complaint.occurrence_complement}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bairro:</span>
                  <p className="font-medium">{complaint.occurrence_neighborhood}</p>
                </div>
                {(complaint.occurrence_city || complaint.occurrence_state) && (
                  <div>
                    <span className="text-muted-foreground">Cidade/Estado:</span>
                    <p className="font-medium">
                      {complaint.occurrence_city}{complaint.occurrence_state && `/${complaint.occurrence_state}`}
                    </p>
                  </div>
                )}
                {complaint.occurrence_zip && (
                  <div>
                    <span className="text-muted-foreground">CEP:</span>
                    <p className="font-medium">{complaint.occurrence_zip}</p>
                  </div>
                )}
                {complaint.occurrence_reference && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Ponto de Referência:</span>
                    <p className="font-medium">{complaint.occurrence_reference}</p>
                  </div>
                )}
                {(complaint.occurrence_block || complaint.occurrence_lot) && (
                  <div>
                    <span className="text-muted-foreground">Quadra/Lote:</span>
                    <p className="font-medium">
                      {complaint.occurrence_block && `Quadra ${complaint.occurrence_block}`}
                      {complaint.occurrence_lot && ` / Lote ${complaint.occurrence_lot}`}
                    </p>
                  </div>
                )}
                {complaint.classification && (
                  <div>
                    <span className="text-muted-foreground">Classificação:</span>
                    <p className="font-medium">{complaint.classification}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Descrição */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descrição
              </h3>
              <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
            </div>

            {/* Localização GPS */}
            {complaint.user_location && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização GPS
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Latitude:</span>
                      <p className="font-medium">{complaint.user_location.latitude}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Longitude:</span>
                      <p className="font-medium">{complaint.user_location.longitude}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Mídias */}
            {(complaint.photos || complaint.videos) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Mídias Anexadas
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {complaint.photos && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Fotos:
                        </span>
                        <p className="font-medium">
                          {Array.isArray(complaint.photos) ? complaint.photos.length : 0} foto(s)
                        </p>
                      </div>
                    )}
                    {complaint.videos && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Vídeos:
                        </span>
                        <p className="font-medium">
                          {Array.isArray(complaint.videos) ? complaint.videos.length : 0} vídeo(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Informações do Sistema */}
            {(complaint.user_device_type || complaint.user_browser || complaint.user_ip) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 text-xs text-muted-foreground">
                    Informações do Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    {complaint.user_device_type && (
                      <div>
                        <span>Dispositivo:</span>
                        <p>{complaint.user_device_type}</p>
                      </div>
                    )}
                    {complaint.user_browser && (
                      <div>
                        <span>Navegador:</span>
                        <p>{complaint.user_browser}</p>
                      </div>
                    )}
                    {complaint.user_ip && (
                      <div>
                        <span>IP:</span>
                        <p>{complaint.user_ip}</p>
                      </div>
                    )}
                    {complaint.system_identifier && (
                      <div>
                        <span>Identificador:</span>
                        <p>{complaint.system_identifier}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
