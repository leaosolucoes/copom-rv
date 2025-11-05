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
