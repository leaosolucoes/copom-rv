import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { logConsultation } from '@/lib/auditLogger';

interface CNPJData {
  cnpj: string;
  nome: string;
  fantasia?: string;
  situacao: string;
  data_situacao: string;
  tipo: string;
  porte: string;
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
  capital_social: string;
  atividade_principal: Array<{
    code: string;
    text: string;
  }>;
  atividades_secundarias?: Array<{
    code: string;
    text: string;
  }>;
}

export function CNPJLookup() {
  const [cnpj, setCnpj] = useState('');
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'public_logo_url')
          .maybeSingle();

        if (error) throw error;
        
        if (data?.value) {
          setLogoUrl(data.value as string);
        }
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }
    };

    fetchLogo();
  }, []);

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    if (formatted.length <= 18) {
      setCnpj(formatted);
    }
  };

  const searchCNPJ = async () => {
    if (!cnpj.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite um CNPJ",
        variant: "destructive",
      });
      return;
    }

    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    if (cleanCnpj.length !== 14) {
      toast({
        title: "Erro",
        description: "CNPJ deve ter 14 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://smytdnkylauxocqrkchn.supabase.co/functions/v1/search-cnpj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y'
        },
        body: JSON.stringify({ cnpj: cleanCnpj }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao consultar CNPJ');
      }

      setCnpjData(result.data);
      setIsModalOpen(true);
      
      // Registrar auditoria
      await logConsultation({
        consultationType: 'CNPJ',
        searchedData: cleanCnpj,
        searchResult: result.data,
        success: true
      });
    } catch (error: any) {
      console.error('Erro na consulta:', error);
      toast({
        title: "Erro na consulta",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
      
      // Registrar auditoria de erro
      await logConsultation({
        consultationType: 'CNPJ',
        searchedData: cleanCnpj,
        success: false,
        errorMessage: error.message || 'Erro desconhecido'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!cnpjData) return;

    try {
      // Criar PDF usando jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Configurar fontes
      pdf.setFont('helvetica', 'bold');
      
      let yPosition = 30;
      
      // Adicionar logo se disponível
      if (logoUrl) {
        try {
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(logoBlob);
            });
            
            const imageFormat = logoBlob.type.includes('png') ? 'PNG' : 
                               logoBlob.type.includes('jpeg') || logoBlob.type.includes('jpg') ? 'JPEG' : 'PNG';
            
            pdf.addImage(logoBase64, imageFormat, 20, 10, 30, 30);
          }
          
          pdf.setFontSize(18);
          pdf.text('CONSULTA DE CNPJ', 60, 20);
          yPosition = 50;
        } catch (logoError) {
          console.error('Erro ao carregar logo:', logoError);
          pdf.setFontSize(18);
          pdf.text('CONSULTA DE CNPJ', 20, 20);
          yPosition = 30;
        }
      } else {
        pdf.setFontSize(18);
        pdf.text('CONSULTA DE CNPJ', 20, 20);
        yPosition = 30;
      }
      
      // Adicionar informações da consulta
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const today = new Date();
      pdf.text(`Data da consulta: ${format(today, 'dd/MM/yyyy HH:mm')}`, 20, yPosition + 5);
      
      yPosition += 25;

      // Dados da empresa
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('DADOS DA EMPRESA', 20, yPosition);
      yPosition += 15;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const empresaData = [
        ['CNPJ', formatCNPJ(cnpjData.cnpj) || '-'],
        ['Razão Social', cnpjData.nome || '-'],
        ['Nome Fantasia', cnpjData.fantasia || '-'],
        ['Situação', cnpjData.situacao || '-'],
        ['Data da Situação', cnpjData.data_situacao || '-'],
        ['Porte', cnpjData.porte || '-'],
        ['Natureza Jurídica', cnpjData.natureza_juridica || '-'],
        ['Capital Social', cnpjData.capital_social || '-'],
        ['Tipo', cnpjData.tipo || '-'],
        ['Telefone', cnpjData.telefone || '-'],
        ['Email', cnpjData.email || '-'],
        ['Endereço', `${cnpjData.logradouro || ''}, ${cnpjData.numero || ''}`],
        ['Complemento', cnpjData.complemento || '-'],
        ['Bairro', cnpjData.bairro || '-'],
        ['Município', cnpjData.municipio || '-'],
        ['UF', cnpjData.uf || '-'],
        ['CEP', cnpjData.cep || '-'],
      ];

      // Adicionar dados usando autoTable
      autoTable(pdf, {
        body: empresaData,
        startY: yPosition,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 130 },
        },
        margin: { left: 20, right: 20 },
      });

      // Atividades (se existirem)
      if (cnpjData.atividade_principal || cnpjData.atividades_secundarias) {
        const finalY = (pdf as any).lastAutoTable.finalY + 20;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('ATIVIDADES', 20, finalY);
        
        let atividadesData = [];
        
        if (cnpjData.atividade_principal) {
          atividadesData.push(['Principal', `${cnpjData.atividade_principal[0]?.code || ''} - ${cnpjData.atividade_principal[0]?.text || ''}`]);
        }
        
        if (cnpjData.atividades_secundarias && cnpjData.atividades_secundarias.length > 0) {
          cnpjData.atividades_secundarias.forEach((atividade: any, index: number) => {
            atividadesData.push([
              index === 0 ? 'Secundárias' : '',
              `${atividade.code || ''} - ${atividade.text || ''}`
            ]);
          });
        }

        autoTable(pdf, {
          body: atividadesData,
          startY: finalY + 10,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          columnStyles: {
            0: { cellWidth: 25, fontStyle: 'bold' },
            1: { cellWidth: 145 },
          },
          margin: { left: 20, right: 20 },
        });
      }

      // Salvar PDF
      const fileName = `consulta-cnpj-${cnpjData.cnpj}-${format(today, 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Sucesso",
        description: "Relatório de CNPJ gerado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao gerar PDF do CNPJ:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório PDF do CNPJ",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Consulta de CNPJ</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={handleCnpjChange}
              maxLength={18}
            />
          </div>
          
          <Button 
            onClick={searchCNPJ} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Consultando...' : 'Consultar CNPJ'}
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={isMobile ? "flex flex-col gap-3" : "flex items-center justify-between"}>
              <span>Dados do CNPJ</span>
              <Button 
                onClick={generatePDF} 
                variant="outline" 
                size={isMobile ? "default" : "sm"}
                className={isMobile ? "w-full" : ""}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {cnpjData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">CNPJ</h3>
                  <p className="text-foreground">{formatCNPJ(cnpjData.cnpj)}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Situação</h3>
                  <p className="text-foreground">{cnpjData.situacao}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Razão Social</h3>
                  <p className="text-foreground">{cnpjData.nome}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Nome Fantasia</h3>
                  <p className="text-foreground">{cnpjData.fantasia || 'Não informado'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Tipo</h3>
                  <p className="text-foreground">{cnpjData.tipo}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Porte</h3>
                  <p className="text-foreground">{cnpjData.porte}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Endereço</h3>
                <div className="text-foreground">
                  <p>{cnpjData.logradouro}, {cnpjData.numero}{cnpjData.complemento && ` - ${cnpjData.complemento}`}</p>
                  <p>{cnpjData.bairro} - {cnpjData.municipio}/{cnpjData.uf}</p>
                  <p>CEP: {cnpjData.cep}</p>
                </div>
              </div>

              {cnpjData.telefone && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Telefone</h3>
                  <p className="text-foreground">{cnpjData.telefone}</p>
                </div>
              )}

              {cnpjData.email && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">E-mail</h3>
                  <p className="text-foreground">{cnpjData.email}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Capital Social</h3>
                <p className="text-foreground">{cnpjData.capital_social}</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Natureza Jurídica</h3>
                <p className="text-foreground">{cnpjData.natureza_juridica}</p>
              </div>

              {cnpjData.atividade_principal && cnpjData.atividade_principal.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Atividade Principal</h3>
                  <p className="text-foreground">
                    {cnpjData.atividade_principal[0].code} - {cnpjData.atividade_principal[0].text}
                  </p>
                </div>
              )}

              {cnpjData.atividades_secundarias && cnpjData.atividades_secundarias.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Atividades Secundárias</h3>
                  <div className="space-y-1">
                    {cnpjData.atividades_secundarias.map((atividade, index) => (
                      <p key={index} className="text-foreground text-sm">
                        {atividade.code} - {atividade.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}