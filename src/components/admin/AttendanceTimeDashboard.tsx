import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, TrendingUp, Users, Timer, Calendar, Download, Eye, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AttendanceTimeStats {
  totalProcessed: number;
  averageTime: number;
  fastestAttendant: { name: string; avgTime: number } | null;
  mostProductiveAttendant: { name: string; count: number } | null;
  attendantRanking: Array<{
    id: string;
    name: string;
    avgTime: number;
    totalProcessed: number;
    minTime: number;
    maxTime: number;
  }>;
  dailyAverages: Array<{ date: string; avgTime: number }>;
}

interface AttendantDetail {
  id: string;
  complainant_name: string;
  occurrence_type: string;
  created_at: string;
  processed_at: string;
  attendanceTime: number;
}

type PeriodFilter = '7' | '15' | '30' | 'month' | 'year' | 'custom';

export function AttendanceTimeDashboard() {
  const [stats, setStats] = useState<AttendanceTimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedAttendant, setSelectedAttendant] = useState<string | null>(null);
  const [attendantDetails, setAttendantDetails] = useState<AttendantDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    
    switch (period) {
      case '7':
        return { start: subDays(now, 7), end: now };
      case '15':
        return { start: subDays(now, 15), end: now };
      case '30':
        return { start: subDays(now, 30), end: now };
      case 'month':
        return { start: subDays(now, 30), end: now };
      case 'year':
        return { start: subDays(now, 365), end: now };
      case 'custom':
        return { 
          start: customStartDate ? new Date(customStartDate) : subDays(now, 7), 
          end: customEndDate ? new Date(customEndDate) : now 
        };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Buscar denúncias processadas no período
      const { data: complaints, error } = await supabase
        .from('complaints')
        .select(`
          id,
          created_at,
          processed_at,
          attendant_id,
          complainant_name,
          occurrence_type,
          users!inner(id, full_name)
        `)
        .not('processed_at', 'is', null)
        .not('attendant_id', 'is', null)
        .gte('processed_at', startOfDay(start).toISOString())
        .lte('processed_at', endOfDay(end).toISOString());

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar estatísticas de atendimento",
          variant: "destructive",
        });
        return;
      }

      if (!complaints || complaints.length === 0) {
        setStats({
          totalProcessed: 0,
          averageTime: 0,
          fastestAttendant: null,
          mostProductiveAttendant: null,
          attendantRanking: [],
          dailyAverages: []
        });
        return;
      }

      // Calcular tempos de atendimento
      const processedComplaints = complaints.map(complaint => ({
        ...complaint,
        attendanceTime: Math.round(
          (new Date(complaint.processed_at!).getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60)
        ) // em minutos
      }));

      // Estatísticas gerais
      const totalProcessed = processedComplaints.length;
      const averageTime = Math.round(
        processedComplaints.reduce((sum, c) => sum + c.attendanceTime, 0) / totalProcessed
      );

      // Agrupar por atendente
      const attendantStats = new Map<string, {
        id: string;
        name: string;
        times: number[];
        count: number;
      }>();

      processedComplaints.forEach(complaint => {
        const attendantId = complaint.attendant_id!;
        const attendantName = (complaint.users as any).full_name;
        
        if (!attendantStats.has(attendantId)) {
          attendantStats.set(attendantId, {
            id: attendantId,
            name: attendantName,
            times: [],
            count: 0
          });
        }

        const attendant = attendantStats.get(attendantId)!;
        attendant.times.push(complaint.attendanceTime);
        attendant.count++;
      });

      // Calcular ranking de atendentes
      const attendantRanking = Array.from(attendantStats.values())
        .map(attendant => ({
          id: attendant.id,
          name: attendant.name,
          avgTime: Math.round(attendant.times.reduce((sum, time) => sum + time, 0) / attendant.times.length),
          totalProcessed: attendant.count,
          minTime: Math.min(...attendant.times),
          maxTime: Math.max(...attendant.times)
        }))
        .sort((a, b) => a.avgTime - b.avgTime);

      // Atendente mais rápido e mais produtivo
      const fastestAttendant = attendantRanking.length > 0 ? 
        { name: attendantRanking[0].name, avgTime: attendantRanking[0].avgTime } : null;
      
      const mostProductiveAttendant = attendantRanking.length > 0 ?
        attendantRanking.reduce((max, current) => 
          current.totalProcessed > max.totalProcessed ? current : max
        ) : null;

      // Médias diárias
      const dailyData = new Map<string, number[]>();
      processedComplaints.forEach(complaint => {
        const date = format(new Date(complaint.processed_at!), 'yyyy-MM-dd');
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(complaint.attendanceTime);
      });

      const dailyAverages = Array.from(dailyData.entries())
        .map(([date, times]) => ({
          date: format(new Date(date + 'T00:00:00'), 'dd/MM', { locale: ptBR }),
          fullDate: date,
          avgTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
        }))
        .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
        .map(({ date, avgTime }) => ({ date, avgTime }));

      setStats({
        totalProcessed,
        averageTime,
        fastestAttendant,
        mostProductiveAttendant: mostProductiveAttendant ? 
          { name: mostProductiveAttendant.name, count: mostProductiveAttendant.totalProcessed } : null,
        attendantRanking,
        dailyAverages
      });

    } catch (error) {
      console.error('Erro ao processar estatísticas:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar estatísticas de atendimento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendantDetails = async (attendantId: string) => {
    try {
      setDetailsLoading(true);
      const { start, end } = getDateRange();

      const { data: complaints, error } = await supabase
        .from('complaints')
        .select(`
          id,
          complainant_name,
          occurrence_type,
          created_at,
          processed_at
        `)
        .eq('attendant_id', attendantId)
        .not('processed_at', 'is', null)
        .gte('processed_at', startOfDay(start).toISOString())
        .lte('processed_at', endOfDay(end).toISOString())
        .order('processed_at', { ascending: false });

      if (error) throw error;

      const details = (complaints || []).map(complaint => ({
        ...complaint,
        attendanceTime: Math.round(
          (new Date(complaint.processed_at!).getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60)
        )
      }));

      setAttendantDetails(details);
    } catch (error) {
      console.error('Erro ao buscar detalhes do atendente:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar detalhes do atendente",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportReport = () => {
    if (!stats) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Tempos de Atendimento', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Período: ${period === 'custom' ? `${customStartDate} a ${customEndDate}` : `Últimos ${period} dias`}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, 40, { align: 'center' });

    // Estatísticas gerais
    let yPosition = 60;
    doc.setFontSize(14);
    doc.text('Estatísticas Gerais', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Total de denúncias processadas: ${stats.totalProcessed}`, 20, yPosition);
    doc.text(`Tempo médio de atendimento: ${stats.averageTime} minutos`, 20, yPosition + 10);
    
    if (stats.fastestAttendant) {
      doc.text(`Atendente mais rápido: ${stats.fastestAttendant.name} (${stats.fastestAttendant.avgTime} min)`, 20, yPosition + 20);
    }
    
    if (stats.mostProductiveAttendant) {
      doc.text(`Atendente mais produtivo: ${stats.mostProductiveAttendant.name} (${stats.mostProductiveAttendant.count} atendimentos)`, 20, yPosition + 30);
    }

    // Ranking de atendentes
    yPosition += 50;
    if (stats.attendantRanking.length > 0) {
      doc.setFontSize(14);
      doc.text('Ranking de Atendentes', 20, yPosition);
      
      const tableData = stats.attendantRanking.map((attendant, index) => [
        `${index + 1}º`,
        attendant.name,
        `${attendant.avgTime} min`,
        attendant.totalProcessed.toString(),
        `${attendant.minTime} min`,
        `${attendant.maxTime} min`
      ]);

      (doc as any).autoTable({
        startY: yPosition + 10,
        head: [['Posição', 'Atendente', 'Tempo Médio', 'Total', 'Menor Tempo', 'Maior Tempo']],
        body: tableData,
        fontSize: 8,
        margin: { left: 20, right: 20 }
      });
    }

    doc.save(`relatorio-tempos-atendimento-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  useEffect(() => {
    fetchStats();
  }, [period, customStartDate, customEndDate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse mb-1" />
                <div className="h-3 bg-muted rounded w-24 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label htmlFor="period">Período</Label>
          <Select value={period} onValueChange={(value: PeriodFilter) => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="year">Último ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {period === 'custom' && (
          <>
            <div>
              <Label htmlFor="start-date">Data início</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data fim</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
        
        <Button onClick={fetchStats} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {!stats || stats.totalProcessed === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nenhum atendimento encontrado</h3>
              <p className="text-muted-foreground">
                Não há denúncias processadas no período selecionado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de métricas */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio Geral</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(stats.averageTime)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalProcessed} atendimentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atendente Mais Rápido</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.fastestAttendant ? formatTime(stats.fastestAttendant.avgTime) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.fastestAttendant?.name || 'Nenhum atendente'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mais Produtivo</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.mostProductiveAttendant?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.mostProductiveAttendant?.name || 'Nenhum atendente'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Processadas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProcessed}</div>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico de evolução temporal */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução dos Tempos Médios</CardTitle>
                <CardDescription>Tempos médios diários de atendimento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.dailyAverages}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => [`${value} min`, 'Tempo médio']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avgTime" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Tempo médio (min)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de comparação entre atendentes */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação Entre Atendentes</CardTitle>
                <CardDescription>Tempo médio por atendente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.attendantRanking.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        fontSize={10}
                      />
                      <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => [`${value} min`, 'Tempo médio']} />
                      <Legend />
                      <Bar 
                        dataKey="avgTime" 
                        fill="hsl(var(--primary))" 
                        name="Tempo médio (min)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de atendentes */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Atendentes</CardTitle>
              <CardDescription>Ordenado por tempo médio de atendimento (mais rápido para mais demorado)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Posição</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Tempo Médio</TableHead>
                    <TableHead>Total Atendimentos</TableHead>
                    <TableHead>Menor Tempo</TableHead>
                    <TableHead>Maior Tempo</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.attendantRanking.map((attendant, index) => (
                    <TableRow key={attendant.id}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{attendant.name}</TableCell>
                      <TableCell>{formatTime(attendant.avgTime)}</TableCell>
                      <TableCell>{attendant.totalProcessed}</TableCell>
                      <TableCell>{formatTime(attendant.minTime)}</TableCell>
                      <TableCell>{formatTime(attendant.maxTime)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedAttendant(attendant.id);
                                fetchAttendantDetails(attendant.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes - {attendant.name}</DialogTitle>
                              <DialogDescription>
                                Atendimentos realizados no período selecionado
                              </DialogDescription>
                            </DialogHeader>
                            
                            {detailsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <strong>Tempo médio:</strong> {formatTime(attendant.avgTime)}
                                  </div>
                                  <div>
                                    <strong>Total:</strong> {attendant.totalProcessed} atendimentos
                                  </div>
                                  <div>
                                    <strong>Faixa:</strong> {formatTime(attendant.minTime)} - {formatTime(attendant.maxTime)}
                                  </div>
                                </div>
                                
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Denunciante</TableHead>
                                      <TableHead>Tipo de Ocorrência</TableHead>
                                      <TableHead>Data Criação</TableHead>
                                      <TableHead>Data Atendimento</TableHead>
                                      <TableHead>Tempo</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {attendantDetails.map((detail) => (
                                      <TableRow key={detail.id}>
                                        <TableCell>{detail.complainant_name}</TableCell>
                                        <TableCell>{detail.occurrence_type}</TableCell>
                                        <TableCell>
                                          {format(new Date(detail.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                        </TableCell>
                                        <TableCell>
                                          {format(new Date(detail.processed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={detail.attendanceTime <= 60 ? "default" : detail.attendanceTime <= 180 ? "secondary" : "destructive"}>
                                            {formatTime(detail.attendanceTime)}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}