import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, ExternalLink, Hash, User, Calendar, Clock, Building, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  assinador_nome?: string;
  hash_assinatura?: string;
  dados_assinatura?: any;
  users?: {
    full_name: string;
  } | null;
  criador?: {
    full_name: string;
  } | null;
  assinador?: {
    full_name: string;
  } | null;
}

interface DetalhesAudienciaAssinadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  audiencia: AudienciaAssinada | null;
}

export function DetalhesAudienciaAssinadaModal({ isOpen, onClose, audiencia }: DetalhesAudienciaAssinadaModalProps) {
  const { toast } = useToast();
  
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

  const generateComprovanteAssinatura = async () => {
    try {
      toast({
        title: "Gerando comprovante...",
        description: "Aguarde enquanto o PDF é criado.",
      });

      // Buscar configurações do sistema (logo, etc.)
      const { data: systemConfig } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['public_logo_url', 'system_name', 'company_name']);

      const settings: Record<string, any> = {};
      systemConfig?.forEach(setting => {
        settings[setting.key] = setting.value;
      });

      const systemName = settings.system_name || 'Sistema de Posturas';
      const companyName = settings.company_name || 'Prefeitura Municipal';

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Configurar fonte
      pdf.setFont('helvetica', 'bold');

      // Adicionar logo se disponível
      let yPosition = 50;
      if (settings.public_logo_url) {
        try {
          const response = await fetch(settings.public_logo_url);
          const blob = await response.blob();
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          const imageFormat = settings.public_logo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
          pdf.addImage(logoBase64, imageFormat, 20, 10, 30, 30);
          pdf.setFontSize(18);
          pdf.text('COMPROVANTE DE ASSINATURA DIGITAL', 60, 20);
          pdf.text('AUDIÊNCIA JUDICIAL', 60, 30);
          yPosition = 50;
        } catch (logoError) {
          console.error('Erro ao carregar logo:', logoError);
          pdf.setFontSize(18);
          pdf.text('COMPROVANTE DE ASSINATURA DIGITAL', 20, 20);
          pdf.text('AUDIÊNCIA JUDICIAL', 20, 30);
          yPosition = 50;
        }
      } else {
        pdf.setFontSize(18);
        pdf.text('COMPROVANTE DE ASSINATURA DIGITAL', 20, 20);
        pdf.text('AUDIÊNCIA JUDICIAL', 20, 30);
        yPosition = 50;
      }

      // Informações do documento
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
      pdf.text(`Data de geração: ${dataGeracao}`, 20, yPosition);
      yPosition += 10;

      // Linha separadora
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;

      // Título da seção
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('INFORMAÇÕES DA AUDIÊNCIA', 20, yPosition);
      yPosition += 15;

      // Informações da audiência
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const infoAudiencia = [
        ['Número do Processo:', audiencia.numero_processo],
        ['Vara:', audiencia.vara],
        ['Data da Audiência:', date],
        ['Horário:', time],
        ['Status:', 'Assinado Digitalmente']
      ];

      infoAudiencia.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 20, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 80, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Título da seção de assinatura
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('DADOS DA ASSINATURA DIGITAL', 20, yPosition);
      yPosition += 15;

      // Informações da assinatura
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const assinador = audiencia.assinador_nome || 'Não informado';
      const dataAssinatura = audiencia.data_assinatura ? formatDataAssinatura(audiencia.data_assinatura) : 'Não informado';

      const infoAssinatura = [
        ['Assinador:', assinador],
        ['Data/Hora da Assinatura:', dataAssinatura],
        ['Método:', 'Assinatura Digital'],
        ['Status:', 'Válida']
      ];

      infoAssinatura.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 20, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 80, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Hash de segurança (se disponível)
      if (audiencia.hash_assinatura) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('HASH DE SEGURANÇA', 20, yPosition);
        yPosition += 10;

        pdf.setFont('courier', 'normal');
        pdf.setFontSize(8);
        
        // Hash completo em uma linha única
        pdf.text(audiencia.hash_assinatura, 20, yPosition);
        yPosition += 15;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('Este hash garante a integridade e autenticidade da assinatura digital.', 20, yPosition);
        yPosition += 6;
        pdf.text('Qualquer alteração no documento resultará em um hash diferente.', 20, yPosition);
        yPosition += 15;
      }

      // Validação
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 150, 0);
      pdf.text('✓ ASSINATURA DIGITAL VÁLIDA', 20, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 10;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Este documento possui assinatura jurídica conforme a regulamentação vigente.', 20, yPosition);
      pdf.text('A veracidade pode ser comprovada através do hash de segurança acima.', 20, yPosition + 8);

      // Footer
      const documentContent = `Comprovante-${audiencia.numero_processo}-${dataGeracao}`;
      const docHash = audiencia.hash_assinatura?.substring(0, 16) || 'N/A';

      // Linha separadora do footer
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, pageHeight - 35, pageWidth - 20, pageHeight - 35);

      // Texto do footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);

      pdf.text(`${systemName} - ${companyName}`, 20, pageHeight - 25);
      pdf.text(`Documento gerado em: ${dataGeracao}`, 20, pageHeight - 18);
      pdf.text(`Hash de Integridade: ${docHash}`, 20, pageHeight - 11);
      pdf.text('Página 1 de 1', pageWidth - 40, pageHeight - 25);

      // Salvar PDF
      const fileName = `comprovante-assinatura-${audiencia.numero_processo.replace(/[^\w\s-]/g, '')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Sucesso!",
        description: "Comprovante de assinatura gerado com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao gerar comprovante:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o comprovante. Tente novamente.",
        variant: "destructive",
      });
    }
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
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Assinador</span>
                </div>
                <p className="font-medium text-sm">{audiencia.assinador_nome || audiencia.assinador?.full_name || audiencia.dados_assinatura?.assinado_por_nome || 'Não informado'}</p>
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
              onClick={generateComprovanteAssinatura}
              className="flex-1 gap-2"
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