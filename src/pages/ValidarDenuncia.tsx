import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  MapPin, 
  FileText,
  ShieldCheck,
  Camera,
  Download
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import QRCodeLib from "qrcode";

interface ComplaintValidation {
  protocol_number: string;
  system_identifier: string;
  status: string;
  created_at: string;
  occurrence_type: string;
  occurrence_date: string;
  occurrence_neighborhood: string;
  occurrence_city: string;
  occurrence_state: string;
  verified: boolean;
}

const ValidarDenuncia = () => {
  const { protocolo } = useParams();
  const [searchParams] = useSearchParams();
  const [protocolInput, setProtocolInput] = useState("");
  const [complaint, setComplaint] = useState<ComplaintValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      nova: "Nova",
      em_andamento: "Em Andamento",
      processada: "Processada",
      verificada: "Verificada",
      arquivada: "Arquivada",
      cadastrada: "Cadastrada",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      nova: "bg-blue-500",
      em_andamento: "bg-yellow-500",
      processada: "bg-green-500",
      verificada: "bg-purple-500",
      arquivada: "bg-gray-500",
      cadastrada: "bg-cyan-500",
    };
    return colorMap[status] || "bg-gray-500";
  };

  const fetchComplaint = async (protocol: string) => {
    setLoading(true);
    setNotFound(false);
    setComplaint(null);

    try {
      const { data, error } = await supabase
        .from("complaints")
        .select(`
          protocol_number,
          system_identifier,
          status,
          created_at,
          occurrence_type,
          occurrence_date,
          occurrence_neighborhood,
          occurrence_city,
          occurrence_state
        `)
        .or(`protocol_number.eq.${protocol},system_identifier.eq.${protocol}`)
        .eq("deleted", false)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setNotFound(true);
        toast({
          title: "Denúncia não encontrada",
          description: "Não foi possível encontrar uma denúncia com este protocolo.",
          variant: "destructive",
        });
      } else {
        setComplaint({
          ...data,
          verified: true,
        });
        toast({
          title: "Denúncia validada!",
          description: "As informações da denúncia foram carregadas com sucesso.",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar denúncia:", error);
      toast({
        title: "Erro ao validar",
        description: "Ocorreu um erro ao buscar as informações da denúncia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (protocolInput.trim()) {
      fetchComplaint(protocolInput.trim());
    }
  };

  const generateValidationCertificate = async () => {
    if (!complaint) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header com fundo
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, "F");

      // Logo/Título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICADO DE VALIDAÇÃO", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("2º Batalhão da Polícia Militar do Estado de Goiás", pageWidth / 2, 30, { align: "center" });

      // Selo de validação
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(2);
      doc.circle(pageWidth / 2, 70, 20);
      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("✓ VALIDADO", pageWidth / 2, 75, { align: "center" });

      // Conteúdo
      let yPos = 110;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMAÇÕES DO PROTOCOLO", 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Número do Protocolo: ${complaint.protocol_number || "N/A"}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Identificador: ${complaint.system_identifier}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Status: ${getStatusText(complaint.status)}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Data de Registro: ${format(new Date(complaint.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, yPos);

      yPos += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMAÇÕES DA OCORRÊNCIA", 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Tipo: ${complaint.occurrence_type}`, 20, yPos);
      
      if (complaint.occurrence_date) {
        yPos += 7;
        doc.text(`Data da Ocorrência: ${format(new Date(complaint.occurrence_date), "dd/MM/yyyy", { locale: ptBR })}`, 20, yPos);
      }
      
      yPos += 7;
      const location = `${complaint.occurrence_neighborhood}${complaint.occurrence_city ? `, ${complaint.occurrence_city}` : ""}${complaint.occurrence_state ? `/${complaint.occurrence_state}` : ""}`;
      doc.text(`Localização: ${location}`, 20, yPos);

      // QR Code
      yPos += 20;
      const qrCodeUrl = `${window.location.origin}/validar/${complaint.protocol_number || complaint.system_identifier}`;
      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrCodeUrl, { width: 200, margin: 1 });
      doc.addImage(qrCodeDataUrl, "PNG", pageWidth / 2 - 25, yPos, 50, 50);

      yPos += 55;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Escaneie o QR Code para validar este certificado", pageWidth / 2, yPos, { align: "center" });

      // Rodapé
      doc.setDrawColor(41, 128, 185);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Validado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`, pageWidth / 2, pageHeight - 22, { align: "center" });
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("2º Batalhão da Polícia Militar do Estado de Goiás", pageWidth / 2, pageHeight - 15, { align: "center" });
      doc.text("Contato: (64) 3620-0910 | E-mail: 2bpmrioverde@gmail.com", pageWidth / 2, pageHeight - 10, { align: "center" });

      // Salvar PDF
      doc.save(`Certificado_Validacao_${complaint.protocol_number || complaint.system_identifier}.pdf`);
      
      toast({
        title: "Certificado gerado!",
        description: "O certificado de validação foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar certificado:", error);
      toast({
        title: "Erro ao gerar certificado",
        description: "Ocorreu um erro ao gerar o certificado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const initQrScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        setShowScanner(false);
        setProtocolInput(decodedText);
        fetchComplaint(decodedText);
      },
      (error) => {
        console.warn("QR Code scan error:", error);
      }
    );

    return scanner;
  };

  useEffect(() => {
    const protocolFromUrl = protocolo || searchParams.get("protocolo");
    if (protocolFromUrl) {
      setProtocolInput(protocolFromUrl);
      fetchComplaint(protocolFromUrl);
    }
  }, [protocolo, searchParams]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (showScanner) {
      scanner = initQrScanner();
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showScanner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-full p-4">
              <ShieldCheck className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Validação de Denúncia
          </h1>
          <p className="text-muted-foreground">
            Verifique a autenticidade de uma denúncia registrada
          </p>
        </div>

        {/* Formulário de busca */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Verificar Protocolo
            </CardTitle>
            <CardDescription>
              Digite o número do protocolo ou escaneie o QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o número do protocolo..."
                value={protocolInput}
                onChange={(e) => setProtocolInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || !protocolInput.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setShowScanner(!showScanner)}
              >
                <Camera className="h-4 w-4 mr-2" />
                {showScanner ? "Fechar Câmera" : "Escanear QR Code"}
              </Button>
            </div>

            {showScanner && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div id="qr-reader" className="w-full"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado da validação */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Validando protocolo...</p>
            </CardContent>
          </Card>
        )}

        {notFound && !loading && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Denúncia não encontrada.</strong>
              <br />
              Verifique se o número do protocolo está correto e tente novamente.
            </AlertDescription>
          </Alert>
        )}

        {complaint && !loading && (
          <Card className="border-2 border-green-500/20">
            <CardHeader className="bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <CardTitle className="text-green-700 dark:text-green-400">
                    Denúncia Validada
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(complaint.status)}>
                    {getStatusText(complaint.status)}
                  </Badge>
                  <Button
                    onClick={generateValidationCertificate}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Certificado
                  </Button>
                </div>
              </div>
              <CardDescription>
                Este protocolo é válido e está registrado em nosso sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Informações do Protocolo */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Informações do Protocolo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Número do Protocolo</p>
                    <p className="font-medium">{complaint.protocol_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Identificador do Sistema</p>
                    <p className="font-medium text-sm break-all">
                      {complaint.system_identifier}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data de Registro */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Data de Registro
                </h3>
                <p className="text-foreground">
                  {format(new Date(complaint.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>

              <Separator />

              {/* Informações da Ocorrência */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Informações da Ocorrência
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Ocorrência</p>
                    <p className="font-medium">{complaint.occurrence_type}</p>
                  </div>
                  {complaint.occurrence_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data da Ocorrência</p>
                      <p className="font-medium">
                        {format(new Date(complaint.occurrence_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="font-medium">
                      {complaint.occurrence_neighborhood}
                      {complaint.occurrence_city && `, ${complaint.occurrence_city}`}
                      {complaint.occurrence_state && `/${complaint.occurrence_state}`}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Nota de Autenticidade */}
              <Alert className="border-primary/20 bg-primary/5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>Certificado de Autenticidade</strong>
                  <br />
                  Este documento foi validado em nosso sistema e corresponde a uma denúncia
                  oficialmente registrada no 2º Batalhão da Polícia Militar do Estado de Goiás.
                  <br />
                  <span className="text-xs text-muted-foreground mt-2 block">
                    Validado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </span>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Rodapé com informações */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="font-semibold">2º Batalhão da Polícia Militar do Estado de Goiás</p>
          <p>Contato: (64) 3620-0910 | E-mail: 2bpmrioverde@gmail.com</p>
          <p className="mt-2 text-xs">
            Este sistema de validação garante a autenticidade dos protocolos de denúncias
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValidarDenuncia;
