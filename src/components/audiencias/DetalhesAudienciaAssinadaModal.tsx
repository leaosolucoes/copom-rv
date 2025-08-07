import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, ExternalLink, Hash, User, Calendar, Clock, Building, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AudienciaAssinada {
  id: string;
  numero_processo: string;
  vara: string;
  data_audiencia: string;
  horario_audiencia: string;
  status: string;
  arquivo_oficio_url: string;
  link_videoconferencia?: string;
  data_assinatura?: string;
  hash_assinatura?: string;
  dados_assinatura?: any;
  users?: {
    full_name: string;
  } | null;
}

interface DetalhesAudienciaAssinadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  audiencia: AudienciaAssinada | null;
}

export function DetalhesAudienciaAssinadaModal({ isOpen, onClose, audiencia }: DetalhesAudienciaAssinadaModalProps) {
  if (!audiencia) return null;

  const formatDateTime = (date: string, time: string) => {
    const dateTime = new Date(`${date}T${time}`);
    return {
      date: format(dateTime, 'dd/MM/yyyy', { locale: ptBR }),
      time: format(dateTime, 'HH:mm', { locale: ptBR })
    };
  };

  const formatDataAssinatura = (dataAssinatura: string) => {
    return format(new Date(dataAssinatura), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const { date, time } = formatDateTime(audiencia.data_audiencia, audiencia.horario_audiencia);

  const handleDownloadOficio = () => {
    window.open(audiencia.arquivo_oficio_url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes da Audiência
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge variant="default" className="bg-green-500 text-white w-fit">
            <CheckCircle className="h-3 w-3 mr-1" />
            Assinado em {audiencia.data_assinatura ? formatDataAssinatura(audiencia.data_assinatura) : 'N/A'}
          </Badge>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações da Audiência */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Informações da Audiência</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Processo</span>
                  </div>
                  <p className="font-medium text-sm">{audiencia.numero_processo}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Vara</span>
                  </div>
                  <p className="font-medium text-sm">{audiencia.vara}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Data</span>
                  </div>
                  <p className="font-medium text-sm">{date}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Horário</span>
                  </div>
                  <p className="font-medium text-sm">{time}</p>
                </div>
              </div>

              {audiencia.link_videoconferencia && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <ExternalLink className="h-3 w-3" />
                    <span>Videoconferência</span>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-blue-600 text-sm"
                    onClick={() => window.open(audiencia.link_videoconferencia, '_blank')}
                  >
                    Acessar Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assinatura Digital */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Assinatura Digital</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Assinador</span>
                  </div>
                  <p className="font-medium text-sm">{audiencia.users?.full_name || 'Não informado'}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">RG</span>
                  </div>
                  <p className="font-medium text-sm">{audiencia.dados_assinatura?.rg || 'Não informado'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Data da Assinatura</span>
                </div>
                <p className="font-medium text-sm">
                  {audiencia.data_assinatura ? formatDataAssinatura(audiencia.data_assinatura) : 'Não informado'}
                </p>
              </div>

              {audiencia.hash_assinatura && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Hash de Segurança</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                    {audiencia.hash_assinatura}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este hash garante a integridade e autenticidade da assinatura
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Assinatura Válida</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Este documento possui assinatura jurídica conforme a regulamentação vigente
              </p>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleDownloadOficio} 
              className="flex-1 gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Baixar Ofício
            </Button>
            <Button 
              className="flex-1 gap-2 bg-gray-800 hover:bg-gray-700"
            >
              <FileText className="h-4 w-4" />
              Comprovantes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}