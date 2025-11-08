import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MediaModal } from "@/components/ui/media-modal";
import { Button } from "@/components/ui/button";
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
  Video,
  Eye,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import jsPDF from "jspdf";
import { toast } from "@/hooks/use-toast";

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
  user_agent?: string;
}

interface ComplaintDetailsModalProps {
  complaint: ComplaintDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ComplaintDetailsModal = ({ complaint, open, onOpenChange }: ComplaintDetailsModalProps) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedMediaType, setSelectedMediaType] = useState<"photo" | "video">("photo");
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  if (!complaint) return null;

  // Processar fotos e vídeos
  const photos = Array.isArray(complaint.photos)
    ? complaint.photos.map((p: any) => (typeof p === "string" ? p : p?.url || p?.path))
    : complaint.photos
      ? [typeof complaint.photos === "string" ? complaint.photos : complaint.photos?.url || complaint.photos?.path]
      : [];

  const videos = Array.isArray(complaint.videos)
    ? complaint.videos.map((v: any) => (typeof v === "string" ? v : v?.url || v?.path))
    : complaint.videos
      ? [typeof complaint.videos === "string" ? complaint.videos : complaint.videos?.url || complaint.videos?.path]
      : [];

  const handlePhotoClick = (index: number) => {
    setSelectedMediaIndex(index);
    setSelectedMediaType("photo");
    setMediaModalOpen(true);
  };

  const handleVideoClick = (index: number) => {
    setSelectedMediaIndex(index);
    setSelectedMediaType("video");
    setMediaModalOpen(true);
  };

  const generatePDF = async () => {
    try {
      toast({
        title: "Gerando PDF...",
        description: "Por favor aguarde",
      });

      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;

      // Carregar logo da instituição
      const loadLogo = async (): Promise<string | null> => {
        try {
          const response = await fetch("/src/assets/logo-2bpm.png");
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error("Erro ao carregar logo:", error);
          return null;
        }
      };

      const logoBase64 = await loadLogo();

      // Função para adicionar rodapé personalizado
      let currentPageNumber = 1;
      const addFooter = (pageNum: number) => {
        const footerY = pageHeight - 20;

        // Linha decorativa superior do rodapé
        doc.setDrawColor(41, 128, 185);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

        // Informações da instituição
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "bold");
        doc.text("2º Batalhão da Polícia Militar do Estado de Goíás", margin, footerY - 2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text("Contato: (64) 3620-0910 | E-mail: 2bpmrioverde@gmail.com", margin, footerY + 3);

        // Número da página e data (alinhado à direita)
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const pageText = `Página ${pageNum} | ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
        const textWidth = doc.getTextWidth(pageText);
        doc.text(pageText, pageWidth - margin - textWidth, footerY + 3);
      };

      // Função para adicionar marca d'água de segurança
      const addWatermark = (pageNum: number, logoBase64: string | null) => {
        // Marca d'água de texto "CONFIDENCIAL" em vermelho bem clarinho
        doc.setTextColor(255, 230, 230); // Vermelho bem clarinho
        doc.setFontSize(50);
        doc.setFont("helvetica", "bold");
        
        // Calcular posição central e rotacionar
        const text = "CONFIDENCIAL";
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;
        
        // Rotacionar 45 graus
        doc.text(text, centerX, centerY, {
          angle: 45,
          align: "center"
        });
        
        // Restaurar cor do texto para o restante do conteúdo
        doc.setTextColor(0, 0, 0);
      };

      // Função auxiliar para verificar espaço e adicionar nova página se necessário
      const checkPageBreak = (spaceNeeded: number) => {
        if (yPos + spaceNeeded > pageHeight - 40) {
          addFooter(currentPageNumber);
          doc.addPage();
          currentPageNumber++;
          addWatermark(currentPageNumber, logoBase64); // Marca d'água PRIMEIRO na nova página
          yPos = 20;
          return true;
        }
        return false;
      };

      // Função auxiliar para adicionar texto com quebra de linha
      const addText = (text: string, x: number, y: number, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + lines.length * (fontSize * 0.5);
      };

      // Função para converter imagem URL para base64
      const getImageBase64 = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error("Erro ao carregar imagem:", error);
          return null;
        }
      };

      // Cabeçalho personalizado com logo
      
      // Adicionar marca d'água PRIMEIRO (para ficar atrás de tudo)
      addWatermark(currentPageNumber, logoBase64);
      
      doc.setFillColor(41, 128, 185); // Azul institucional
      doc.rect(0, 0, pageWidth, 50, "F");

      // Adicionar logo se carregado com sucesso
      if (logoBase64) {
        try {
          const logoWidth = 35;
          const logoHeight = 35;
          doc.addImage(logoBase64, "PNG", margin, 7, logoWidth, logoHeight);

          // Textos ao lado do logo
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(20);
          doc.setFont("helvetica", "bold");
          doc.text("RELATÓRIO DE DENÚNCIA", margin + logoWidth + 10, 18);

          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.text("2º Batalhão da Polícia Militar", margin + logoWidth + 10, 26);

          doc.setFontSize(9);
          doc.setTextColor(220, 220, 220);
          doc.text(
            `Protocolo: ${complaint.protocol_number || complaint.system_identifier}`,
            margin + logoWidth + 10,
            33,
          );
        } catch (logoError) {
          console.error("Erro ao adicionar logo ao PDF:", logoError);
        }
      } else {
        // Fallback caso logo não carregue
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("RELATÓRIO DE DENÚNCIA", margin, 18);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("2º Batalhão da Polícia Militar", margin, 28);

        doc.setFontSize(9);
        doc.text(`Protocolo: ${complaint.protocol_number || complaint.system_identifier}`, margin, 38);
      }

      // Linha decorativa
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(margin, 45, pageWidth - margin, 45);

      doc.setTextColor(0, 0, 0);
      yPos = 60;

      // Status e Data
      yPos = addText(`Status: ${getStatusText(complaint.status)}`, margin, yPos, 11, true);
      yPos = addText(
        `Data de Registro: ${format(new Date(complaint.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        margin,
        yPos + 5,
        10,
      );
      yPos += 10;

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Dados do Denunciante
      yPos = addText("DADOS DO DENUNCIANTE", margin, yPos, 12, true);
      yPos += 5;
      yPos = addText(`Nome: ${complaint.complainant_name}`, margin, yPos);
      yPos = addText(`Telefone: ${complaint.complainant_phone}`, margin, yPos + 5);
      if (complaint.complainant_type) {
        yPos = addText(`Tipo: ${complaint.complainant_type}`, margin, yPos + 5);
      }
      if (complaint.complainant_address) {
        const address = `${complaint.complainant_address}${complaint.complainant_number ? `, ${complaint.complainant_number}` : ""}${complaint.complainant_complement ? ` - ${complaint.complainant_complement}` : ""}`;
        yPos = addText(`Endereço: ${address}`, margin, yPos + 5);
      }
      if (complaint.complainant_neighborhood) {
        yPos = addText(`Bairro: ${complaint.complainant_neighborhood}`, margin, yPos + 5);
      }
      if (complaint.complainant_city || complaint.complainant_state) {
        yPos = addText(
          `Cidade/Estado: ${complaint.complainant_city || ""}${complaint.complainant_state ? `/${complaint.complainant_state}` : ""}`,
          margin,
          yPos + 5,
        );
      }
      yPos += 10;

      // Verificar se precisa de nova página
      checkPageBreak(50);

      // Linha separadora
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Dados da Ocorrência
      yPos = addText("DADOS DA OCORRÊNCIA", margin, yPos, 12, true);
      yPos += 5;
      yPos = addText(`Tipo: ${complaint.occurrence_type}`, margin, yPos);
      if (complaint.occurrence_date) {
        yPos = addText(
          `Data da Ocorrência: ${format(new Date(complaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}`,
          margin,
          yPos + 5,
        );
      }
      if (complaint.occurrence_time) {
        yPos = addText(`Hora: ${complaint.occurrence_time}`, margin, yPos + 5);
      }
      const occAddress = `${complaint.occurrence_address}${complaint.occurrence_number ? `, ${complaint.occurrence_number}` : ""}${complaint.occurrence_complement ? ` - ${complaint.occurrence_complement}` : ""}`;
      yPos = addText(`Endereço: ${occAddress}`, margin, yPos + 5);
      yPos = addText(`Bairro: ${complaint.occurrence_neighborhood}`, margin, yPos + 5);
      if (complaint.occurrence_city || complaint.occurrence_state) {
        yPos = addText(
          `Cidade/Estado: ${complaint.occurrence_city || ""}${complaint.occurrence_state ? `/${complaint.occurrence_state}` : ""}`,
          margin,
          yPos + 5,
        );
      }
      if (complaint.occurrence_reference) {
        yPos = addText(`Referência: ${complaint.occurrence_reference}`, margin, yPos + 5);
      }
      if (complaint.classification) {
        yPos = addText(`Classificação: ${complaint.classification}`, margin, yPos + 5);
      }
      yPos += 10;

      // Verificar se precisa de nova página
      checkPageBreak(50);

      // Linha separadora
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Descrição
      yPos = addText("DESCRIÇÃO", margin, yPos, 12, true);
      yPos += 5;
      yPos = addText(complaint.description, margin, yPos);
      yPos += 10;

      // Localização GPS
      if (complaint.user_location) {
        checkPageBreak(60);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
        yPos = addText("LOCALIZAÇÃO GPS", margin, yPos, 12, true);
        yPos += 5;
        yPos = addText(`Latitude: ${complaint.user_location.latitude}`, margin, yPos);
        yPos = addText(`Longitude: ${complaint.user_location.longitude}`, margin, yPos + 5);
        yPos += 5;

        // Link para Google Maps
        const mapsUrl = `https://www.google.com/maps?q=${complaint.user_location.latitude},${complaint.user_location.longitude}`;
        doc.setTextColor(59, 130, 246);
        doc.textWithLink("Ver localização no Google Maps", margin, yPos + 5, { url: mapsUrl });
        doc.setTextColor(0, 0, 0);
        yPos += 15;
      }

      // Fotos
      if (photos.length > 0) {
        checkPageBreak(80);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
        yPos = addText("FOTOS ANEXADAS", margin, yPos, 12, true);
        yPos += 5;
        yPos = addText(`Total de ${photos.length} foto(s)`, margin, yPos, 9);
        yPos += 10;

        // Adicionar cada foto
        for (let i = 0; i < Math.min(photos.length, 6); i++) {
          const photoUrl = photos[i];

          try {
            const base64Image = await getImageBase64(photoUrl);

            if (base64Image) {
              // Verificar se precisa de nova página (imagem + legenda precisa de ~85mm)
              checkPageBreak(90);

              // Adicionar imagem (máximo 150x150)
              const imgWidth = 80;
              const imgHeight = 80;

              try {
                doc.addImage(base64Image, "JPEG", margin, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 5;
                yPos = addText(`Foto ${i + 1}`, margin, yPos, 8);
                yPos += 10;
              } catch (imgError) {
                console.error("Erro ao adicionar imagem ao PDF:", imgError);
                yPos = addText(`Foto ${i + 1}: Erro ao carregar`, margin, yPos, 8);
                yPos += 10;
              }
            }
          } catch (error) {
            console.error(`Erro ao processar foto ${i + 1}:`, error);
            yPos = addText(`Foto ${i + 1}: Não disponível`, margin, yPos, 8);
            yPos += 10;
          }
        }

        if (photos.length > 6) {
          yPos = addText(`+ ${photos.length - 6} foto(s) adicional(is) não exibida(s)`, margin, yPos, 8);
          yPos += 10;
        }
      }

      // Vídeos
      if (videos.length > 0) {
        checkPageBreak(40);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
        yPos = addText("VÍDEOS ANEXADOS", margin, yPos, 12, true);
        yPos += 5;
        yPos = addText(`Total de ${videos.length} vídeo(s)`, margin, yPos, 9);
        yPos += 10;
      }

      // Informações do Sistema e Dados Técnicos
      if (complaint.user_device_type || complaint.user_browser || complaint.user_ip || complaint.system_identifier) {
        checkPageBreak(60);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
        yPos = addText("INFORMAÇÕES DO SISTEMA E DADOS TÉCNICOS", margin, yPos, 12, true);
        yPos += 5;

        if (complaint.system_identifier) {
          yPos = addText(`Identificador do Sistema: ${complaint.system_identifier}`, margin, yPos, 9);
        }
        if (complaint.user_device_type) {
          yPos = addText(`Dispositivo: ${complaint.user_device_type}`, margin, yPos + 5, 9);
        }
        if (complaint.user_browser) {
          yPos = addText(`Navegador: ${complaint.user_browser}`, margin, yPos + 5, 9);
        }
        if (complaint.user_ip) {
          yPos = addText(`Endereço IP: ${complaint.user_ip}`, margin, yPos + 5, 9);
        }
        if (complaint.user_agent) {
          yPos = addText(`User Agent: ${complaint.user_agent}`, margin, yPos + 5, 8);
        }

        yPos += 10;

        // Adicionar timestamp de geração
        doc.setTextColor(100, 100, 100);
        yPos = addText(
          `Relatório gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`,
          margin,
          yPos,
          8,
        );
        doc.setTextColor(0, 0, 0);
      }

      // Adicionar rodapé na última página
      addFooter(currentPageNumber);

      // Salvar PDF
      doc.save(`denuncia-${complaint.protocol_number || complaint.system_identifier}.pdf`);

      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi baixado para seu dispositivo",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível criar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "nova":
        return "bg-blue-500";
      case "em_andamento":
        return "bg-red-500";
      case "processada":
        return "bg-green-500";
      case "arquivada":
        return "bg-gray-500";
      default:
        return "bg-purple-500";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "nova":
        return "Nova";
      case "em_andamento":
        return "Em Andamento";
      case "processada":
        return "Processada";
      case "arquivada":
        return "Arquivada";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Protocolo #{complaint.protocol_number || complaint.system_identifier}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Status e Data */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(complaint.status)}>{getStatusText(complaint.status)}</Badge>
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
                      {complaint.complainant_city}
                      {complaint.complainant_state && `/${complaint.complainant_state}`}
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
                      {complaint.occurrence_city}
                      {complaint.occurrence_state && `/${complaint.occurrence_state}`}
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
            {(photos.length > 0 || videos.length > 0) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Mídias Anexadas
                  </h3>

                  {/* Fotos */}
                  {photos.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        <span>Fotos ({photos.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photoUrl: string, index: number) => (
                          <div
                            key={index}
                            className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all"
                            onClick={() => handlePhotoClick(index)}
                          >
                            <img
                              src={photoUrl}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImagem%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vídeos */}
                  {videos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="h-4 w-4" />
                        <span>Vídeos ({videos.length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {videos.map((videoUrl: string, index: number) => (
                          <div
                            key={index}
                            className="relative group cursor-pointer aspect-video rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all bg-black"
                            onClick={() => handleVideoClick(index)}
                          >
                            <video src={videoUrl} className="w-full h-full object-contain" preload="metadata" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              Vídeo {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Informações do Sistema */}
            {(complaint.user_device_type || complaint.user_browser || complaint.user_ip) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 text-xs text-muted-foreground">Informações do Sistema</h3>
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

      {/* Modal de visualização de mídia */}
      {mediaModalOpen && (
        <MediaModal
          isOpen={mediaModalOpen}
          onClose={() => {
            setMediaModalOpen(false);
          }}
          media={selectedMediaType === "photo" ? photos : videos}
          initialIndex={selectedMediaIndex}
          type={selectedMediaType}
        />
      )}
    </Dialog>
  );
};
