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
import autoTable from 'jspdf-autotable';

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
          start: customStartDate ? new Date(customStartDate) : subDays(now, 30), 
          end: customEndDate ? new Date(customEndDate) : now 
        };
      default:
        return { start: subDays(now, 30), end: now }; // Mudança: aumentar período padrão para 30 dias
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
          verified_at
        `)
        .not('processed_at', 'is', null)
        .not('attendant_id', 'is', null)
        .gte('processed_at', startOfDay(start).toISOString())
        .lte('processed_at', endOfDay(end).toISOString());

      console.log('🔍 DEBUG AttendanceTime - Complaints found:', complaints?.length);
      console.log('🔍 DEBUG AttendanceTime - Date range:', { start: startOfDay(start).toISOString(), end: endOfDay(end).toISOString() });

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
        console.log('🔍 DEBUG AttendanceTime - No complaints found, checking all data...');
        
        // Verificar se há dados no banco sem filtro de data
        const { data: allComplaints } = await supabase
          .from('complaints')
          .select('id, processed_at, attendant_id')
          .not('processed_at', 'is', null)
          .not('attendant_id', 'is', null)
          .limit(5);
          
        console.log('🔍 DEBUG AttendanceTime - All complaints sample:', allComplaints);
        
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

      // Buscar informações dos usuários separadamente
      const attendantIds = [...new Set(complaints.map(c => c.attendant_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', attendantIds);

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
      }

      console.log('🔍 DEBUG AttendanceTime - Users found:', users?.length);

      // Criar mapa de usuários para lookup rápido
      const usersMap = new Map();
      users?.forEach(user => {
        usersMap.set(user.id, user.full_name);
      });

      // Calcular tempos de atendimento
      const processedComplaints = complaints.map(complaint => {
        // Se a denúncia foi verificada pelo admin (tem verified_at), 
        // calcular tempo a partir de verified_at até processed_at
        // Caso contrário, usar o tempo total desde created_at
        const startTime = complaint.verified_at 
          ? new Date(complaint.verified_at).getTime()
          : new Date(complaint.created_at).getTime();
          
        const attendanceTime = Math.round(
          (new Date(complaint.processed_at!).getTime() - startTime) / (1000 * 60)
        ); // em minutos
        
        return {
          ...complaint,
          attendanceTime
        };
      });

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
        const attendantName = usersMap.get(attendantId) || 'Usuário não encontrado';
        
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
          processed_at,
          verified_at
        `)
        .eq('attendant_id', attendantId)
        .not('processed_at', 'is', null)
        .gte('processed_at', startOfDay(start).toISOString())
        .lte('processed_at', endOfDay(end).toISOString())
        .order('processed_at', { ascending: false });

      if (error) throw error;

      const details = (complaints || []).map(complaint => {
        // Se a denúncia foi verificada pelo admin (tem verified_at), 
        // calcular tempo a partir de verified_at até processed_at
        // Caso contrário, usar o tempo total desde created_at
        const startTime = complaint.verified_at 
          ? new Date(complaint.verified_at).getTime()
          : new Date(complaint.created_at).getTime();
          
        const attendanceTime = Math.round(
          (new Date(complaint.processed_at!).getTime() - startTime) / (1000 * 60)
        ); // em minutos
        
        return {
          ...complaint,
          attendanceTime
        };
      });

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

  const exportReport = async () => {
    if (!stats) return;

    try {
      // Buscar logo do sistema
      console.log('🔍 Buscando logo do sistema...');
      const { data: logoData, error: logoError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'public_logo_url')
        .single();

      console.log('🔍 Logo data:', logoData);
      console.log('🔍 Logo error:', logoError);

      const logoUrl = logoData?.value?.[0] || logoData?.value || '';
      console.log('🔍 Logo URL:', logoUrl);

      // Criar PDF usando jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Configurar fontes
      pdf.setFont('helvetica', 'bold');
      
      let yPosition = 30;
      
      // Adicionar logo se disponível
      if (logoUrl) {
        try {
          // Converter URL da logo para base64
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(logoBlob);
            });
            
            // Detectar formato da imagem
            const imageFormat = logoBlob.type.includes('png') ? 'PNG' : 
                               logoBlob.type.includes('jpeg') || logoBlob.type.includes('jpg') ? 'JPEG' : 'PNG';
            
            // Adicionar logo no cabeçalho (lado esquerdo)
            pdf.addImage(logoBase64, imageFormat, 20, 10, 30, 30);
          }
          
          // Posicionar o título ao lado da logo
          pdf.setFontSize(18);
          pdf.text('RELATÓRIO DE TEMPOS DE ATENDIMENTO', 60, 20);
          yPosition = 50; // Aumentar a posição Y para dar espaço à logo
        } catch (logoError) {
          console.error('Erro ao carregar logo:', logoError);
          pdf.setFontSize(18);
          pdf.text('RELATÓRIO DE TEMPOS DE ATENDIMENTO', 20, 20);
          yPosition = 30;
        }
      } else {
        pdf.setFontSize(18);
        pdf.text('RELATÓRIO DE TEMPOS DE ATENDIMENTO', 20, 20);
        yPosition = 30;
      }
      
      // Adicionar informações do relatório
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const today = new Date();
      const { start, end } = getDateRange();
      const dateRange = period === 'custom' && customStartDate && customEndDate
        ? `${format(new Date(customStartDate), 'dd/MM/yyyy')} a ${format(new Date(customEndDate), 'dd/MM/yyyy')}`
        : period === 'custom' && customStartDate
        ? `A partir de ${format(new Date(customStartDate), 'dd/MM/yyyy')}`
        : period === 'custom' && customEndDate
        ? `Até ${format(new Date(customEndDate), 'dd/MM/yyyy')}`
        : `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`;
      
      pdf.text(`Período: ${dateRange}`, 20, yPosition + 5);
      pdf.text(`Data de geração: ${format(today, 'dd/MM/yyyy HH:mm')}`, 20, yPosition + 15);
      pdf.text(`Total de denúncias processadas: ${stats.totalProcessed}`, 20, yPosition + 25);
      
      yPosition += 40;

      // Seção de Estatísticas Gerais
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('ESTATÍSTICAS GERAIS', 20, yPosition);
      
      yPosition += 15;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      const statsData = [
        ['Tempo médio geral de atendimento:', `${stats.averageTime} minutos`],
        ['Total de denúncias processadas:', stats.totalProcessed.toString()],
      ];
      
      if (stats.fastestAttendant) {
        statsData.push(['Atendente mais rápido:', `${stats.fastestAttendant.name} (${stats.fastestAttendant.avgTime} min)`]);
      }
      
      if (stats.mostProductiveAttendant) {
        statsData.push(['Atendente mais produtivo:', `${stats.mostProductiveAttendant.name} (${stats.mostProductiveAttendant.count} atendimentos)`]);
      }

      // Adicionar estatísticas usando autoTable
      autoTable(pdf, {
        body: statsData,
        startY: yPosition,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { cellWidth: 100 }
        },
        margin: { left: 20, right: 20 },
        theme: 'plain'
      });

      // Seção de Ranking de Atendentes
      const finalY = (pdf as any).lastAutoTable.finalY + 20;
      
      if (stats.attendantRanking.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('RANKING DE ATENDENTES', 20, finalY);
        
        const tableColumns = ['Posição', 'Atendente', 'Tempo Médio', 'Total', 'Menor Tempo', 'Maior Tempo'];
        
        const tableData = stats.attendantRanking.map((attendant, index) => [
          `${index + 1}º`,
          attendant.name,
          `${attendant.avgTime} min`,
          attendant.totalProcessed.toString(),
          `${attendant.minTime} min`,
          `${attendant.maxTime} min`
        ]);

        // Adicionar tabela de ranking
        autoTable(pdf, {
          head: [tableColumns],
          body: tableData,
          startY: finalY + 10,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          margin: { left: 20, right: 20 }
        });
      }

      // Salvar PDF
      pdf.save(`relatorio-tempos-atendimento-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar relatório PDF",
        variant: "destructive",
      });
    }
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