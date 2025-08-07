import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Calendar, Clock, MapPin, PenTool } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Audiencia {
  id: string;
  numero_processo: string;
  vara: string;
  data_audiencia: string;
  horario_audiencia: string;
  status: string;
  arquivo_oficio_url: string;
  link_videoconferencia?: string;
  data_assinatura?: string;
  user_id: string;
  users?: {
    full_name: string;
  } | null;
}

interface DetalhesAudienciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  audiencia: Audiencia | null;
  isFiscal?: boolean;
}

export function DetalhesAudienciaModal({ isOpen, onClose, audiencia, isFiscal = false }: DetalhesAudienciaModalProps) {
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  
  if (!audiencia) return null;

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleDownloadOficio = () => {
    if (audiencia.arquivo_oficio_url) {
      window.open(audiencia.arquivo_oficio_url, '_blank');
    }
  };

  const handleAcessarVideoconferencia = () => {
    if (audiencia.link_videoconferencia) {
      window.open(audiencia.link_videoconferencia, '_blank');
    }
  };

  const handleAssinarDigitalmente = async () => {
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('audiencias')
        .update({
          status: 'assinado',
          data_assinatura: new Date().toISOString(),
          dados_assinatura: {
            assinado_em: new Date().toISOString(),
            metodo: 'digital',
            ip_assinatura: 'fiscal_dashboard'
          }
        })
        .eq('id', audiencia.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Ofício assinado digitalmente com sucesso.",
        variant: "default",
      });

      // Fechar modal e atualizar dados
      onClose();
      
      // Reload the page to show updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Erro ao assinar ofício:', error);
      toast({
        title: "Erro",
        description: "Não foi possível assinar o ofício. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalhes da Audiência</DialogTitle>
            <Badge 
              variant={audiencia.status === 'pendente' ? 'destructive' : 'default'}
              className={audiencia.status === 'pendente' ? 'bg-red-100 text-red-700 border-red-200' : ''}
            >
              {audiencia.status === 'pendente' ? 'Pendente' : 'Assinado'}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações da Audiência */}
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-3">
              Informações da Audiência
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Processo</p>
                  <p className="text-sm text-muted-foreground">{audiencia.numero_processo}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Vara</p>
                  <p className="text-sm text-muted-foreground">{audiencia.vara}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">{formatDate(audiencia.data_audiencia)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Horário</p>
                  <p className="text-sm text-muted-foreground">{audiencia.horario_audiencia}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Videoconferência */}
          {audiencia.link_videoconferencia && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Videoconferência</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAcessarVideoconferencia}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Link
                </Button>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDownloadOficio}
            >
              <FileText className="h-4 w-4 mr-2" />
              Baixar Ofício
            </Button>
            
            {audiencia.status === 'pendente' && (
              isFiscal ? (
                <Button 
                  variant="default" 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAssinarDigitalmente}
                  disabled={isAssigning}
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  {isAssigning ? "Assinando..." : "Assinar Digitalmente"}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                  disabled
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Aguardando Assinatura
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}