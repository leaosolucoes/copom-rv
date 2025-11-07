import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface RegionPrediction {
  region: string;
  center: { lat: number; lng: number };
  historical: number[];
  predicted: number[];
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  avgPerWeek: number;
  topTypes: string[];
}

export const exportPredictiveToPDF = (predictions: RegionPrediction[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Cabeçalho
  doc.setFontSize(18);
  doc.setTextColor(45, 80, 22);
  doc.text('Relatório de Análise Preditiva', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 22, { align: 'center' });
  
  // Métricas gerais
  const totalPredicted = predictions.reduce((sum, p) => sum + p.predicted.reduce((a, b) => a + b, 0), 0);
  const totalHistorical = predictions.reduce((sum, p) => sum + p.historical.reduce((a, b) => a + b, 0), 0);
  const avgConfidence = Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumo Executivo', 14, 35);
  
  const summaryData = [
    ['Previsão (4 semanas)', `${totalPredicted} denúncias`],
    ['Histórico (8 semanas)', `${totalHistorical} denúncias`],
    ['Confiança Média', `${avgConfidence}%`],
    ['Regiões Analisadas', `${predictions.length}`]
  ];
  
  autoTable(doc, {
    startY: 40,
    head: [['Métrica', 'Valor']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [45, 80, 22] },
    styles: { fontSize: 10 }
  });
  
  // Detalhes por região
  let currentY = (doc as any).lastAutoTable.finalY + 10;
  
  predictions.forEach((pred, index) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(11);
    doc.setTextColor(45, 80, 22);
    doc.text(`${pred.region}`, 14, currentY);
    
    currentY += 5;
    
    const trendText = pred.trend === 'up' ? 'Crescimento' : pred.trend === 'down' ? 'Redução' : 'Estável';
    const trendColor = pred.trend === 'up' ? [220, 38, 38] : pred.trend === 'down' ? [34, 197, 94] : [100, 100, 100];
    
    const regionDetails = [
      ['Coordenadas', `${pred.center.lat.toFixed(4)}, ${pred.center.lng.toFixed(4)}`],
      ['Tendência', trendText],
      ['Média Semanal', `${pred.avgPerWeek} denúncias`],
      ['Previsão 4 semanas', `${pred.predicted.reduce((a, b) => a + b, 0)} denúncias`],
      ['Confiança', `${pred.confidence}%`],
      ['Principais Tipos', pred.topTypes.join(', ')]
    ];
    
    autoTable(doc, {
      startY: currentY,
      body: regionDetails,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 3;
    
    // Tabela de dados históricos e previstos
    const dataTable = [
      ['Período', 'Denúncias'],
      ...pred.historical.map((val, i) => [`Semana -${pred.historical.length - i}`, `${val}`]),
      ...pred.predicted.map((val, i) => [`Semana +${i + 1} (Prev)`, `${val}`])
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [dataTable[0]],
      body: dataTable.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [45, 80, 22], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'right' }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 8;
  });
  
  // Metodologia
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Metodologia de Previsão', 14, currentY);
  
  currentY += 7;
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const methodology = [
    '• Análise Temporal: Baseada nas últimas 8 semanas de dados históricos',
    '• Agrupamento Geográfico: Denúncias agrupadas em regiões com raio de ~2km',
    '• Modelo: Regressão linear simples para projeção de tendências',
    '• Confiança: Calculada através do coeficiente de determinação (R²)',
    '• Atualização: As previsões são recalculadas automaticamente com novos dados'
  ];
  
  methodology.forEach((line) => {
    doc.text(line, 14, currentY);
    currentY += 5;
  });
  
  // Salvar
  doc.save(`analise-preditiva-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportPredictiveToExcel = (predictions: RegionPrediction[]) => {
  const workbook = XLSX.utils.book_new();
  
  // Planilha 1: Resumo Executivo
  const totalPredicted = predictions.reduce((sum, p) => sum + p.predicted.reduce((a, b) => a + b, 0), 0);
  const totalHistorical = predictions.reduce((sum, p) => sum + p.historical.reduce((a, b) => a + b, 0), 0);
  const avgConfidence = Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length);
  
  const summaryData = [
    ['RELATÓRIO DE ANÁLISE PREDITIVA'],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    ['Métrica', 'Valor'],
    ['Previsão (4 semanas)', `${totalPredicted} denúncias`],
    ['Histórico (8 semanas)', `${totalHistorical} denúncias`],
    ['Confiança Média', `${avgConfidence}%`],
    ['Regiões Analisadas', `${predictions.length}`]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  
  // Planilha 2: Dados por Região
  const regionData = [
    ['Região', 'Latitude', 'Longitude', 'Tendência', 'Média Semanal', 'Previsão 4 Semanas', 'Confiança (%)', 'Principais Tipos']
  ];
  
  predictions.forEach(pred => {
    const trendText = pred.trend === 'up' ? 'Crescimento' : pred.trend === 'down' ? 'Redução' : 'Estável';
    regionData.push([
      pred.region,
      pred.center.lat.toFixed(6),
      pred.center.lng.toFixed(6),
      trendText,
      pred.avgPerWeek.toString(),
      pred.predicted.reduce((a, b) => a + b, 0).toString(),
      pred.confidence.toString(),
      pred.topTypes.join(', ')
    ]);
  });
  
  const regionSheet = XLSX.utils.aoa_to_sheet(regionData);
  XLSX.utils.book_append_sheet(workbook, regionSheet, 'Regiões');
  
  // Planilha 3: Dados Temporais Detalhados
  const maxHistorical = Math.max(...predictions.map(p => p.historical.length));
  const maxPredicted = Math.max(...predictions.map(p => p.predicted.length));
  
  const temporalHeader = ['Período'];
  predictions.forEach(pred => {
    temporalHeader.push(`${pred.region} - Histórico`);
    temporalHeader.push(`${pred.region} - Previsão`);
  });
  
  const temporalData = [temporalHeader];
  
  for (let i = 0; i < maxHistorical; i++) {
    const row: any[] = [`Semana -${maxHistorical - i}`];
    predictions.forEach(pred => {
      row.push(pred.historical[i] !== undefined ? pred.historical[i] : '');
      row.push('');
    });
    temporalData.push(row);
  }
  
  for (let i = 0; i < maxPredicted; i++) {
    const row: any[] = [`Semana +${i + 1}`];
    predictions.forEach(pred => {
      row.push('');
      row.push(pred.predicted[i] !== undefined ? pred.predicted[i] : '');
    });
    temporalData.push(row);
  }
  
  const temporalSheet = XLSX.utils.aoa_to_sheet(temporalData);
  XLSX.utils.book_append_sheet(workbook, temporalSheet, 'Dados Temporais');
  
  // Planilha 4: Metodologia
  const methodologyData = [
    ['METODOLOGIA DE PREVISÃO'],
    [],
    ['Análise Temporal', 'Baseada nas últimas 8 semanas de dados históricos'],
    ['Agrupamento Geográfico', 'Denúncias agrupadas em regiões com raio de ~2km'],
    ['Modelo', 'Regressão linear simples para projeção de tendências'],
    ['Confiança', 'Calculada através do coeficiente de determinação (R²)'],
    ['Atualização', 'As previsões são recalculadas automaticamente com novos dados']
  ];
  
  const methodologySheet = XLSX.utils.aoa_to_sheet(methodologyData);
  XLSX.utils.book_append_sheet(workbook, methodologySheet, 'Metodologia');
  
  // Salvar
  XLSX.writeFile(workbook, `analise-preditiva-${new Date().toISOString().split('T')[0]}.xlsx`);
};
