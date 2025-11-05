import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import { ExportOptions, exportData } from '@/utils/exportUtils';
import { toast } from '@/hooks/use-toast';
import { ExportFiltersModal } from './ExportFiltersModal';

interface ExportButtonProps extends Omit<ExportOptions, 'format'> {
  showFilters?: boolean;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
}

export const ExportButton = ({
  data,
  columns,
  filename,
  metadata,
  filters: initialFilters,
  showFilters = false,
  onExport,
}: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [currentFilters, setCurrentFilters] = useState(initialFilters);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setIsExporting(true);
      
      // Se deve mostrar filtros, abrir modal primeiro
      if (showFilters && !showFiltersModal) {
        setShowFiltersModal(true);
        return;
      }

      // Executar exportação
      exportData({
        data,
        columns,
        filename,
        format,
        metadata,
        filters: currentFilters,
      });

      toast({
        title: 'Exportação concluída',
        description: `Arquivo ${format.toUpperCase()} gerado com sucesso!`,
      });

      onExport?.(format);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyFilters = (filters: ExportOptions['filters']) => {
    setCurrentFilters(filters);
    setShowFiltersModal(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || data.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileJson className="mr-2 h-4 w-4" />
            Exportar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showFilters && (
        <ExportFiltersModal
          open={showFiltersModal}
          onOpenChange={setShowFiltersModal}
          onApplyFilters={handleApplyFilters}
          initialFilters={currentFilters}
          availableUsers={Array.from(new Set(data.map((d: any) => d.user_name || d.attendant_name).filter(Boolean)))}
          availableStatus={Array.from(new Set(data.map((d: any) => d.status).filter(Boolean)))}
        />
      )}
    </>
  );
};
