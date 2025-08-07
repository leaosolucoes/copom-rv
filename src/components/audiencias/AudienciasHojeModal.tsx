import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, User, FileText, MessageSquare, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface AudienciaHoje {
  id: string;
  numero_processo: string;
  vara: string;
  data_audiencia: string;
  horario_audiencia: string;
  status: string;
  users?: {
    full_name: string;
  } | null;
}

interface AudienciasHojeModalProps {
  isOpen: boolean;
  onClose: () => void;
  audiencias: AudienciaHoje[];
}

export function AudienciasHojeModal({ isOpen, onClose, audiencias }: AudienciasHojeModalProps) {
  const formatDateTime = (date: string, time: string) => {
    const dateTime = new Date(`${date}T${time}`);
    return {
      date: format(dateTime, 'dd/MM/yyyy', { locale: ptBR }),
      time: format(dateTime, 'HH:mm', { locale: ptBR })
    };
  };

  const generateWhatsAppText = () => {
    if (audiencias.length === 0) return;

    const today = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    
    let whatsappText = `🏛️ *AUDIÊNCIAS JUDICIAIS - HOJE*\n📅 *Data:* ${today}\n\n`;
    
    audiencias.forEach((audiencia, index) => {
      const { time } = formatDateTime(audiencia.data_audiencia, audiencia.horario_audiencia);
      const fiscalName = audiencia.users?.full_name || 'Fiscal não informado';
      
      whatsappText += `${index + 1}. ⚖️ *${fiscalName}*\n`;
      whatsappText += `   ⏰ *Horário:* ${time}\n`;
      whatsappText += `   *Processo:* ${audiencia.numero_processo}\n`;
      whatsappText += `   *Vara:* ${audiencia.vara}\n`;
      if (index < audiencias.length - 1) {
        whatsappText += `\n`;
      }
    });

    navigator.clipboard.writeText(whatsappText).then(() => {
      toast.success("Texto copiado para a área de transferência!");
    }).catch(() => {
      toast.error("Erro ao copiar texto");
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Audiências de Hoje
            <Badge variant="secondary" className="ml-2">
              {audiencias.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {audiencias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma audiência para hoje</p>
              <p className="text-sm">Não há audiências agendadas para hoje</p>
            </div>
          ) : (
            <>
              {audiencias.map((audiencia) => {
                const { date, time } = formatDateTime(audiencia.data_audiencia, audiencia.horario_audiencia);
                return (
                  <Card key={audiencia.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          {/* Fiscal/Usuário */}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-lg">
                              {audiencia.users?.full_name || 'Fiscal não informado'}
                            </span>
                          </div>

                          {/* Processo */}
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Processo:</span>
                            <span className="font-medium">{audiencia.numero_processo}</span>
                          </div>

                          {/* Data e Horário */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Data:</span>
                              <span className="font-medium">{date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Horário:</span>
                              <span className="font-medium">{time}</span>
                            </div>
                          </div>

                          {/* Vara */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Vara:</span>
                            <span className="font-medium">{audiencia.vara}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant={audiencia.status === 'assinado' ? 'default' : 'secondary'}
                            className={audiencia.status === 'assinado' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}
                          >
                            {audiencia.status === 'assinado' ? 'Assinado' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Botão para gerar WhatsApp */}
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={generateWhatsAppText}
                  className="bg-green-500 hover:bg-green-600 text-white gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Gerar texto para WhatsApp (todas as audiências)
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}