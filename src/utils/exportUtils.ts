import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format as formatDate } from 'date-fns';

export interface ExportColumn {
  key: string;
  label: string;
  format?: 'date' | 'datetime' | 'currency' | 'boolean' | 'text';
  width?: number;
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  users?: string[];
  searchTerm?: string;
  customFilters?: Record<string, any>;
}

export interface ExportOptions {
  data: any[];
  filename: string;
  format: 'pdf' | 'excel' | 'csv';
  columns: ExportColumn[];
  filters?: ExportFilters;
  metadata?: {
    title: string;
    subtitle?: string;
    generatedBy?: string;
    logoUrl?: string;
    companyName?: string;
  };
}

// Formatar valores de acordo com o tipo
const formatValue = (value: any, format?: ExportColumn['format']): string => {
  if (value === null || value === undefined) return '';
  
  switch (format) {
    case 'date':
      return value ? formatDate(new Date(value), 'dd/MM/yyyy') : '';
    case 'datetime':
      return value ? formatDate(new Date(value), 'dd/MM/yyyy HH:mm') : '';
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    case 'boolean':
      return value ? 'Sim' : 'Não';
    case 'text':
    default:
      return String(value);
  }
};

// Aplicar filtros aos dados
const applyFilters = (data: any[], filters?: ExportFilters): any[] => {
  if (!filters) return data;
  
  let filtered = [...data];
  
  // Filtro de data
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.created_at || item.date || item.timestamp);
      return itemDate >= dateFrom;
    });
  }
  
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo);
    dateTo.setHours(23, 59, 59, 999);
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.created_at || item.date || item.timestamp);
      return itemDate <= dateTo;
    });
  }
  
  // Filtro de status
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter(item => filters.status!.includes(item.status));
  }
  
  // Filtro de usuários
  if (filters.users && filters.users.length > 0) {
    filtered = filtered.filter(item => 
      filters.users!.includes(item.user_name || item.user_id || item.attendant_name)
    );
  }
  
  // Filtro de busca
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(term)
      )
    );
  }
  
  // Filtros customizados
  if (filters.customFilters) {
    Object.entries(filters.customFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        filtered = filtered.filter(item => item[key] === value);
      }
    });
  }
  
  return filtered;
};

// Exportar para CSV
export const exportToCSV = (options: ExportOptions): void => {
  const { data, filename, columns, filters } = options;
  
  // Aplicar filtros
  const filteredData = applyFilters(data, filters);
  
  // Criar cabeçalhos
  const headers = columns.map(col => col.label).join(',');
  
  // Criar linhas
  const rows = filteredData.map(row => 
    columns.map(col => {
      const value = formatValue(row[col.key], col.format);
      // Escapar aspas e vírgulas
      return value.includes(',') || value.includes('"') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',')
  ).join('\n');
  
  // Adicionar BOM para UTF-8
  const csv = '\uFEFF' + headers + '\n' + rows;
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Exportar para Excel
export const exportToExcel = (options: ExportOptions): void => {
  const { data, filename, columns, filters, metadata } = options;
  
  // Aplicar filtros
  const filteredData = applyFilters(data, filters);
  
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Preparar dados para a planilha
  const wsData: any[][] = [];
  
  // Adicionar título se houver
  if (metadata?.title) {
    wsData.push([metadata.title]);
    wsData.push([]);
  }
  
  // Adicionar cabeçalhos
  wsData.push(columns.map(col => col.label));
  
  // Adicionar dados
  filteredData.forEach(row => {
    wsData.push(columns.map(col => {
      const value = row[col.key];
      // Manter tipos originais para Excel
      if (col.format === 'date' || col.format === 'datetime') {
        return value ? new Date(value) : '';
      }
      return value;
    }));
  });
  
  // Criar worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Configurar larguras das colunas
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;
  
  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Exportar para PDF
export const exportToPDF = (options: ExportOptions): void => {
  const { data, filename, columns, filters, metadata } = options;
  
  // Aplicar filtros
  const filteredData = applyFilters(data, filters);
  
  const doc = new jsPDF({
    orientation: columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Adicionar título
  if (metadata?.title) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(metadata.title, 14, 15);
    
    if (metadata.subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(metadata.subtitle, 14, 22);
    }
  }
  
  // Preparar dados da tabela
  const tableData = filteredData.map(row =>
    columns.map(col => formatValue(row[col.key], col.format))
  );
  
  // Adicionar tabela
  autoTable(doc, {
    head: [columns.map(col => col.label)],
    body: tableData,
    startY: metadata?.title ? 28 : 14,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
  });
  
  // Adicionar rodapé
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Download
  doc.save(`${filename}.pdf`);
};

// Exportar denúncia individual para PDF
export const exportComplaintToPDF = async (complaint: any): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = 15;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Função auxiliar para adicionar texto com quebra de linha
  const addText = (text: string, isBold: boolean = false, fontSize: number = 10) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth);
    
    // Verificar se precisa de nova página
    if (yPosition + (lines.length * 5) > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = 15;
    }
    
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5 + 2;
  };

  // Função auxiliar para adicionar seção
  const addSection = (title: string) => {
    if (yPosition > 20) {
      yPosition += 3;
    }
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin + 2, yPosition + 5.5);
    doc.setTextColor(0, 0, 0);
    yPosition += 12;
  };

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DA DENÚNCIA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Protocolo
  if (complaint.protocol_number || complaint.id) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Protocolo: ${complaint.protocol_number || complaint.id.slice(0, 8).toUpperCase()}`, margin, yPosition);
    yPosition += 8;
  }

  // Dados do Denunciante
  addSection('DADOS DO DENUNCIANTE');
  addText(`Nome: ${complaint.complainant_name || 'Não informado'}`);
  addText(`Telefone: ${complaint.complainant_phone || 'Não informado'}`);
  addText(`Tipo: ${complaint.complainant_type || 'Não informado'}`);
  addText(`Bairro: ${complaint.complainant_neighborhood || 'Não informado'}`);
  
  let enderecoDenunciante = complaint.complainant_address || 'Não informado';
  if (complaint.complainant_number) enderecoDenunciante += ` nº ${complaint.complainant_number}`;
  if (complaint.complainant_block) enderecoDenunciante += `, Quadra ${complaint.complainant_block}`;
  if (complaint.complainant_lot) enderecoDenunciante += `, Lote ${complaint.complainant_lot}`;
  addText(`Endereço: ${enderecoDenunciante}`);

  // Dados da Ocorrência
  addSection('DADOS DA OCORRÊNCIA');
  addText(`Tipo de Ocorrência: ${complaint.occurrence_type || 'Não informado'}`);
  addText(`Bairro: ${complaint.occurrence_neighborhood || 'Não informado'}`);
  
  let enderecoOcorrencia = complaint.occurrence_address || 'Não informado';
  if (complaint.occurrence_number) enderecoOcorrencia += ` nº ${complaint.occurrence_number}`;
  if (complaint.occurrence_block) enderecoOcorrencia += `, Quadra ${complaint.occurrence_block}`;
  if (complaint.occurrence_lot) enderecoOcorrencia += `, Lote ${complaint.occurrence_lot}`;
  addText(`Endereço: ${enderecoOcorrencia}`);
  
  if (complaint.occurrence_reference) {
    addText(`Referência: ${complaint.occurrence_reference}`);
  }
  
  if (complaint.occurrence_date) {
    addText(`Data da Ocorrência: ${formatDate(new Date(complaint.occurrence_date), 'dd/MM/yyyy')}`);
  }
  
  if (complaint.occurrence_time) {
    addText(`Horário: ${complaint.occurrence_time}`);
  }

  // Descrição da Denúncia
  addSection('DESCRIÇÃO DA DENÚNCIA');
  addText(complaint.description || 'Não informado');

  // Informações Adicionais
  addSection('INFORMAÇÕES ADICIONAIS');
  addText(`Classificação: ${complaint.classification || 'Não informado'}`);
  addText(`Status: ${complaint.status || 'Não informado'}`);
  
  if (complaint.system_identifier) {
    addText(`Identificador do Sistema: ${complaint.system_identifier}`);
  }
  
  addText(`Data de Criação: ${formatDate(new Date(complaint.created_at), 'dd/MM/yyyy HH:mm')}`);
  
  if (complaint.whatsapp_sent) {
    addText(`WhatsApp Enviado: Sim${complaint.whatsapp_sent_at ? ` em ${formatDate(new Date(complaint.whatsapp_sent_at), 'dd/MM/yyyy HH:mm')}` : ''}`);
  }

  // Mídias Anexadas
  if ((complaint.photos && complaint.photos.length > 0) || (complaint.videos && complaint.videos.length > 0)) {
    addSection('MÍDIAS ANEXADAS');
    
    if (complaint.photos && complaint.photos.length > 0) {
      addText(`Fotos: ${complaint.photos.length} arquivo(s)`, true);
      complaint.photos.forEach((photo: string, index: number) => {
        addText(`  ${index + 1}. ${photo.split('/').pop()}`);
      });
    }
    
    if (complaint.videos && complaint.videos.length > 0) {
      addText(`Vídeos: ${complaint.videos.length} arquivo(s)`, true);
      complaint.videos.forEach((video: string, index: number) => {
        addText(`  ${index + 1}. ${video.split('/').pop()}`);
      });
    }
  }

  // Informações do Usuário
  const hasUserInfo = complaint.user_location || complaint.user_device_type || 
                     complaint.user_browser || complaint.user_ip || complaint.user_agent;
  
  if (hasUserInfo) {
    addSection('INFORMAÇÕES DO USUÁRIO');
    
    if (complaint.user_device_type) {
      addText(`Dispositivo: ${complaint.user_device_type}`);
    }
    
    if (complaint.user_browser) {
      addText(`Navegador: ${complaint.user_browser}`);
    }
    
    if (complaint.user_ip) {
      addText(`IP: ${complaint.user_ip}`);
    }
    
    if (complaint.user_agent) {
      addText(`User Agent: ${complaint.user_agent}`);
    }
    
    if (complaint.user_location) {
      const location = typeof complaint.user_location === 'string' 
        ? JSON.parse(complaint.user_location) 
        : complaint.user_location;
      
      if (location.latitude && location.longitude) {
        addText(`Localização: Lat ${location.latitude}, Long ${location.longitude}`);
      }
      
      if (location.accuracy) {
        addText(`Precisão: ${location.accuracy}m`);
      }
    }
  }

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Download
  const fileName = `denuncia_${complaint.protocol_number || complaint.id.slice(0, 8)}_${formatDate(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
};

// Função principal que detecta o formato
export const exportData = (options: ExportOptions): void => {
  switch (options.format) {
    case 'csv':
      exportToCSV(options);
      break;
    case 'excel':
      exportToExcel(options);
      break;
    case 'pdf':
      exportToPDF(options);
      break;
    default:
      throw new Error(`Formato não suportado: ${options.format}`);
  }
};
