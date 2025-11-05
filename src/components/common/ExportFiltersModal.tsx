import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportFilters } from '@/utils/exportUtils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExportFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: ExportFilters) => void;
  initialFilters?: ExportFilters;
  availableUsers?: string[];
  availableStatus?: string[];
}

export const ExportFiltersModal = ({
  open,
  onOpenChange,
  onApplyFilters,
  initialFilters,
  availableUsers = [],
  availableStatus = [],
}: ExportFiltersModalProps) => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    initialFilters?.dateFrom ? new Date(initialFilters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    initialFilters?.dateTo ? new Date(initialFilters.dateTo) : undefined
  );
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    initialFilters?.users || []
  );
  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    initialFilters?.status || []
  );
  const [searchTerm, setSearchTerm] = useState(initialFilters?.searchTerm || '');

  useEffect(() => {
    if (initialFilters) {
      setDateFrom(initialFilters.dateFrom ? new Date(initialFilters.dateFrom) : undefined);
      setDateTo(initialFilters.dateTo ? new Date(initialFilters.dateTo) : undefined);
      setSelectedUsers(initialFilters.users || []);
      setSelectedStatus(initialFilters.status || []);
      setSearchTerm(initialFilters.searchTerm || '');
    }
  }, [initialFilters]);

  const handleApply = () => {
    onApplyFilters({
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
      users: selectedUsers.length > 0 ? selectedUsers : undefined,
      status: selectedStatus.length > 0 ? selectedStatus : undefined,
      searchTerm: searchTerm || undefined,
    });
  };

  const handleClear = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedUsers([]);
    setSelectedStatus([]);
    setSearchTerm('');
  };

  const toggleUser = (user: string) => {
    setSelectedUsers(prev =>
      prev.includes(user)
        ? prev.filter(u => u !== user)
        : [...prev, user]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtros de Exportação</DialogTitle>
          <DialogDescription>
            Personalize os dados que deseja exportar aplicando filtros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Período */}
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data inicial'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data final'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Busca */}
          <div className="space-y-2">
            <Label htmlFor="search">Busca Livre</Label>
            <Input
              id="search"
              placeholder="Digite para buscar em todos os campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Usuários */}
          {availableUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Usuários</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {availableUsers.map(user => (
                  <div key={user} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user}`}
                      checked={selectedUsers.includes(user)}
                      onCheckedChange={() => toggleUser(user)}
                    />
                    <label
                      htmlFor={`user-${user}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {user}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {availableStatus.length > 0 && (
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {availableStatus.map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={selectedStatus.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <label
                      htmlFor={`status-${status}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
          <Button onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
