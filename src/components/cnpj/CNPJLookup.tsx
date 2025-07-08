import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

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
  const { toast } = useToast();

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
    } catch (error: any) {
      console.error('Erro na consulta:', error);
      toast({
        title: "Erro na consulta",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = () => {
    if (!cnpjData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Consulta de CNPJ', pageWidth / 2, 20, { align: 'center' });
    
    // Informações principais
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    let yPos = 40;
    const lineHeight = 8;
    
    const addLine = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value || 'Não informado', 70, yPos);
      yPos += lineHeight;
    };
    
    addLine('CNPJ', formatCNPJ(cnpjData.cnpj));
    addLine('Razão Social', cnpjData.nome);
    addLine('Nome Fantasia', cnpjData.fantasia || 'Não informado');
    addLine('Situação', cnpjData.situacao);
    addLine('Data da Situação', cnpjData.data_situacao);
    addLine('Tipo', cnpjData.tipo);
    addLine('Porte', cnpjData.porte);
    addLine('Natureza Jurídica', cnpjData.natureza_juridica);
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Endereço:', 20, yPos);
    yPos += lineHeight;
    
    const endereco = `${cnpjData.logradouro}, ${cnpjData.numero}${cnpjData.complemento ? ` - ${cnpjData.complemento}` : ''}`;
    const endereco2 = `${cnpjData.bairro} - ${cnpjData.municipio}/${cnpjData.uf}`;
    const endereco3 = `CEP: ${cnpjData.cep}`;
    
    doc.setFont('helvetica', 'normal');
    doc.text(endereco, 20, yPos);
    yPos += lineHeight;
    doc.text(endereco2, 20, yPos);
    yPos += lineHeight;
    doc.text(endereco3, 20, yPos);
    yPos += lineHeight;
    
    if (cnpjData.telefone) {
      addLine('Telefone', cnpjData.telefone);
    }
    if (cnpjData.email) {
      addLine('E-mail', cnpjData.email);
    }
    
    addLine('Capital Social', cnpjData.capital_social);
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Atividade Principal:', 20, yPos);
    yPos += lineHeight;
    
    if (cnpjData.atividade_principal && cnpjData.atividade_principal.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(`${cnpjData.atividade_principal[0].code} - ${cnpjData.atividade_principal[0].text}`, 20, yPos);
      yPos += lineHeight;
    }
    
    if (cnpjData.atividades_secundarias && cnpjData.atividades_secundarias.length > 0) {
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Atividades Secundárias:', 20, yPos);
      yPos += lineHeight;
      
      doc.setFont('helvetica', 'normal');
      cnpjData.atividades_secundarias.forEach(atividade => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${atividade.code} - ${atividade.text}`, 20, yPos);
        yPos += lineHeight;
      });
    }
    
    // Data da consulta
    yPos += 10;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(`Consulta realizada em: ${new Date().toLocaleString('pt-BR')}`, 20, yPos);
    
    // Salvar o PDF
    doc.save(`CNPJ_${cnpjData.cnpj}.pdf`);
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
            <DialogTitle className="flex items-center justify-between">
              Dados do CNPJ
              <Button onClick={generatePDF} variant="outline" size="sm">
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