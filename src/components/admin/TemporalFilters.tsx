import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, X, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface TemporalFiltersProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  comparisonRange: DateRange | null;
  onComparisonRangeChange: (range: DateRange | null) => void;
}

export const TemporalFilters = ({
  dateRange,
  onDateRangeChange,
  comparisonRange,
  onComparisonRangeChange,
}: TemporalFiltersProps) => {
  const [showComparison, setShowComparison] = useState(false);

  const quickFilters = [
    {
      label: 'Hoje',
      getValue: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { from: today, to: tomorrow };
      },
    },
    {
      label: 'Últimos 7 dias',
      getValue: () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return { from: sevenDaysAgo, to: today };
      },
    },
    {
      label: 'Últimos 30 dias',
      getValue: () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return { from: thirtyDaysAgo, to: today };
      },
    },
    {
      label: 'Este mês',
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        return { from: firstDay, to: lastDay };
      },
    },
    {
      label: 'Mês passado',
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        lastDay.setHours(23, 59, 59, 999);
        return { from: firstDay, to: lastDay };
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Filtros Temporais
        </CardTitle>
        <CardDescription>
          Filtre denúncias por período e compare diferentes intervalos de tempo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Período Principal */}
        <div className="space-y-2">
          <Label>Período de Análise</Label>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Button
                key={filter.label}
                variant={
                  dateRange &&
                  format(dateRange.from, 'yyyy-MM-dd') ===
                    format(filter.getValue().from, 'yyyy-MM-dd') &&
                  format(dateRange.to, 'yyyy-MM-dd') ===
                    format(filter.getValue().to, 'yyyy-MM-dd')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => onDateRangeChange(filter.getValue())}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'flex-1 justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange ? (
                  format(dateRange.from, 'dd/MM/yyyy')
                ) : (
                  <span>Data inicial</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.from}
                onSelect={(date) => {
                  if (date) {
                    onDateRangeChange({
                      from: date,
                      to: dateRange?.to || date,
                    });
                  }
                }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'flex-1 justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange ? (
                  format(dateRange.to, 'dd/MM/yyyy')
                ) : (
                  <span>Data final</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.to}
                onSelect={(date) => {
                  if (date) {
                    onDateRangeChange({
                      from: dateRange?.from || date,
                      to: date,
                    });
                  }
                }}
                disabled={(date) => {
                  if (!dateRange?.from) return false;
                  return date < dateRange.from;
                }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          {dateRange && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDateRangeChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {dateRange && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {format(dateRange.from, 'dd/MM/yyyy')} até{' '}
              {format(dateRange.to, 'dd/MM/yyyy')}
            </Badge>
          </div>
        )}

        {/* Comparação */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Comparar com outro período
            </Label>
            <Button
              variant={showComparison ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowComparison(!showComparison);
                if (showComparison) {
                  onComparisonRangeChange(null);
                }
              }}
            >
              {showComparison ? 'Ativo' : 'Ativar'}
            </Button>
          </div>

          {showComparison && (
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !comparisonRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {comparisonRange ? (
                        format(comparisonRange.from, 'dd/MM/yyyy')
                      ) : (
                        <span>Data inicial</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={comparisonRange?.from}
                      onSelect={(date) => {
                        if (date) {
                          onComparisonRangeChange({
                            from: date,
                            to: comparisonRange?.to || date,
                          });
                        }
                      }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !comparisonRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {comparisonRange ? (
                        format(comparisonRange.to, 'dd/MM/yyyy')
                      ) : (
                        <span>Data final</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={comparisonRange?.to}
                      onSelect={(date) => {
                        if (date) {
                          onComparisonRangeChange({
                            from: comparisonRange?.from || date,
                            to: date,
                          });
                        }
                      }}
                      disabled={(date) => {
                        if (!comparisonRange?.from) return false;
                        return date < comparisonRange.from;
                      }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>

                {comparisonRange && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onComparisonRangeChange(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {comparisonRange && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                  Comparação: {format(comparisonRange.from, 'dd/MM/yyyy')} até{' '}
                  {format(comparisonRange.to, 'dd/MM/yyyy')}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
