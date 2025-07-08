import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Download, MessageSquare, Calendar, Send, Archive, Check, CalendarIcon, Image, Video } from 'lucide-react';
import { MediaModal } from "@/components/ui/media-modal";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = 'nova' | 'cadastrada' | 'finalizada' | 'a_verificar' | 'verificado';

interface Complaint {
  id: string;
  // Dados do reclamante
  complainant_name: string;
  complainant_phone: string;
  complainant_type: string;
  complainant_address: string;
  complainant_number?: string;
  complainant_block?: string;
  complainant_lot?: string;
  complainant_neighborhood: string;
  
  // Endereço da ocorrência
  occurrence_type: string;
  occurrence_address: string;
  occurrence_number?: string;
  occurrence_block?: string;
  occurrence_lot?: string;
  occurrence_neighborhood: string;
  occurrence_reference?: string;
  
  // Dados da reclamação
  narrative: string;
  occurrence_date?: string;
  occurrence_time?: string;
  classification: string;
  assigned_to?: string;
  photos?: string[];
  videos?: string[];
  
  // Controle interno
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  attendant_id?: string;
  system_identifier?: string;
  whatsapp_sent?: boolean;
}

export const ComplaintsList = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [raiData, setRaiData] = useState({ rai: '', classification: '' });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [cnpjSearch, setCnpjSearch] = useState<string>('');
  const [cnpjData, setCnpjData] = useState<any>(null);
  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    media: string[];
    initialIndex: number;
    type: 'photo' | 'video';
  }>({
    isOpen: false,
    media: [],
    initialIndex: 0,
    type: 'photo'
  });
  const [cnpjModalOpen, setCnpjModalOpen] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useSupabaseAuth();
  
  // Get user role from the profile object
  const userRole = profile?.role || 'atendente';

  useEffect(() => {
    fetchComplaints();
    fetchClassifications();
    fetchSoundSettings();
    fetchLogo();
  }, [userRole]);

  useEffect(() => {
    const subscription = setupRealtimeUpdates();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userRole]);

  const setupRealtimeUpdates = () => {
    console.log(`🔗 Configurando realtime para: ${userRole}`);
    
    const channel = supabase
      .channel(`complaints-changes-${userRole}-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        (payload) => {
          console.log(`📢 REALTIME UPDATE RECEBIDO (${userRole}):`, payload);
          console.log(`📢 Event Type (${userRole}):`, payload.eventType);
          console.log(`📢 Novos dados (${userRole}):`, payload.new);
          
          if (payload.eventType === 'INSERT' && payload.new && payload.new.status === 'nova') {
            console.log(`🔊 Nova denúncia detectada para ${userRole}, tocando som...`);
            playNotificationSound();
          }
          
          console.log(`🔄 Atualizando lista de denúncias (${userRole})...`);
          refetch();
        }
      )
      .subscribe();

    return channel;
  };

  const refetch = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          attendant:users!complaints_attendant_id_fkey(full_name),
          archived_by_user:users!complaints_archived_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`🔍 ComplaintsList - userRole: ${userRole}`);
      console.log(`🔍 ComplaintsList - complaints: ${data?.length || 0}`);
      console.log(`🔍 ComplaintsList - classifications: ${JSON.stringify(classifications)}`);
      
      setComplaints(data as Complaint[]);
    } catch (error) {
      console.error('Erro ao recarregar denúncias:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      // Clear any cached data and force fresh query
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          attendant:users!complaints_attendant_id_fkey(full_name),
          archived_by_user:users!complaints_archived_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter complaints based on user role for attendants
      let filteredData = data || [];
      
      if (profile?.role === 'atendente') {
        // Atendentes não podem ver denúncias com status 'finalizada' ou 'a_verificar'
        filteredData = data?.filter(complaint => 
          complaint.status !== 'finalizada' && complaint.status !== 'a_verificar'
        ) || [];
      }
      
      console.log(`🔍 ComplaintsList - userRole: ${userRole}`);
      console.log(`🔍 ComplaintsList - profile role: ${profile?.role}`);
      console.log(`🔍 ComplaintsList - total complaints: ${data?.length || 0}`);
      console.log(`🔍 ComplaintsList - filtered complaints: ${filteredData?.length || 0}`);
      console.log(`🔍 ComplaintsList - classifications: ${JSON.stringify(classifications)}`);
      
      setComplaints(filteredData as Complaint[]);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSoundSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sound_notifications_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setSoundEnabled(data?.value === true);
    } catch (error) {
      console.error('Erro ao carregar configurações de som:', error);
    }
  };

  const fetchClassifications = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'classifications')
        .single();

      if (error) throw error;
      const value = data.value;
      setClassifications(Array.isArray(value) ? value.filter(item => typeof item === 'string') as string[] : []);
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    }
  };

  const fetchLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'public_logo_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data?.value) {
        setLogoUrl(data.value as string);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  };

  const searchCnpj = async () => {
    if (!cnpjSearch.trim()) {
      toast({
        title: "Aviso",
        description: "Digite um CNPJ para pesquisar",
        variant: "destructive",
      });
      return;
    }

    setCnpjLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-cnpj', {
        body: { cnpj: cnpjSearch }
      });

      if (error) throw error;

      if (data.success) {
        setCnpjData(data.data);
        setCnpjModalOpen(true);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao consultar CNPJ",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro ao consultar CNPJ:', error);
      toast({
        title: "Erro",
        description: "Erro ao consultar CNPJ. Verifique se o número está correto.",
        variant: "destructive",
      });
    } finally {
      setCnpjLoading(false);
    }
  };

  const exportCnpjToPDF = async () => {
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
        ['CNPJ', cnpjData.cnpj || '-'],
        ['Razão Social', cnpjData.nome || '-'],
        ['Nome Fantasia', cnpjData.fantasia || '-'],
        ['Situação', cnpjData.situacao || '-'],
        ['Data de Abertura', cnpjData.abertura || '-'],
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

  const playNotificationSound = () => {
    console.log('🔊 Tentando tocar som - soundEnabled:', soundEnabled);
    
    if (!soundEnabled) {
      console.log('🔇 Som desabilitado nas configurações');
      return;
    }

    try {
      // Criar um áudio mais simples e confiável
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwMZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAOUo8j6vGUdBjOQ3fHWeCwEJ3LL7eGPOgMVaLzt5JFPEC1YrdbqsGYfBjuV4PTXfjYEH2y8796iRgEXmMn96YFMAzKQz/fGdyQCK3rM7+WQRALEgbb+zG0lBR6J3PrHeCYEFWq88+aUUwGFgLT4028nBHuu5/ueNQMTcLjp4p9UE0+Y1vL6rWclBwTBpcl+3gABSHcA';
      audio.volume = 0.8;
      audio.preload = 'auto';
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Som tocado com sucesso!');
          })
          .catch((error) => {
            console.log('❌ Erro ao tocar som principal, tentando fallback:', error);
            
            // Fallback: criar som usando Web Audio API
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.5);
              
              console.log('✅ Som fallback tocado com sucesso!');
            } catch (fallbackError) {
              console.log('❌ Erro no fallback também:', fallbackError);
            }
          });
      }
    } catch (error) {
      console.log('❌ Erro ao criar áudio:', error);
    }
  };

  const sendToAdmin = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'a_verificar',
          processed_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia enviada para verificação do administrador!",
      });
      
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao enviar para admin:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar denúncia para administrador",
        variant: "destructive",
      });
    }
  };

  const updateComplaintStatus = async (id: string, status: ComplaintStatus, systemIdentifier?: string) => {
    try {
      const updateData: any = {
        status,
        attendant_id: user?.id,
        processed_at: new Date().toISOString(),
        classification: raiData.classification || ''
      };

      if (systemIdentifier) {
        updateData.system_identifier = systemIdentifier;
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Denúncia ${status === 'cadastrada' ? 'cadastrada' : 'atualizada'} com sucesso!`,
      });
      
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar denúncia",
        variant: "destructive",
      });
    }
  };

  const archiveComplaint = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'finalizada' as ComplaintStatus,
          processed_at: new Date().toISOString(),
          archived_by: user?.id
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia arquivada no histórico",
      });
      
      setSelectedComplaint(null);
      refetch();
    } catch (error) {
      console.error('Erro ao arquivar denúncia:', error);
      toast({
        title: "Erro",
        description: "Erro ao arquivar denúncia",
        variant: "destructive",
      });
    }
  };

  const markAsVerified = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'verificado' as ComplaintStatus,
          processed_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia marcada como verificada e retornada para o atendente!",
      });
      
      fetchComplaints();
    } catch (error: any) {
      console.error('Erro ao marcar como verificada:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar denúncia como verificada",
        variant: "destructive",
      });
    }
  };

  const sendWhatsAppMessage = async (complaint: Complaint) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-secure', {
        body: { 
          phone: complaint.complainant_phone,
          complaintId: complaint.id,
          message: `Olá ${complaint.complainant_name}, sua denúncia foi registrada com sucesso!`
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Mensagem enviada via WhatsApp!",
      });
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem via WhatsApp",
        variant: "destructive",
      });
    }
  };

  const openMediaModal = (media: string[], initialIndex: number, type: 'photo' | 'video') => {
    console.log('openMediaModal called with:', { media, initialIndex, type });
    setMediaModal({
      isOpen: true,
      media,
      initialIndex,
      type
    });
  };

  const closeMediaModal = () => {
    setMediaModal({
      isOpen: false,
      media: [],
      initialIndex: 0,
      type: 'photo'
    });
  };

  const exportComplaintsPDF = async () => {
    // Verificar permissão antes de executar
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores podem exportar relatórios PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Filtrar denúncias do histórico (finalizada e cadastrada) - sempre usar histórico para PDF
      let complaintsToExport = complaints.filter(complaint => 
        complaint.status === 'finalizada' || complaint.status === 'cadastrada'
      );
      
      // Aplicar filtros de busca se houver
      if (searchTerm) {
        complaintsToExport = complaintsToExport.filter(complaint =>
          complaint.complainant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          complaint.occurrence_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          complaint.classification.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filtrar por data se especificado - usando created_at como "Data Recebida"
      if (startDate || endDate) {
        complaintsToExport = complaintsToExport.filter(complaint => {
          const complaintDate = new Date(complaint.created_at);
          // Normalizar as datas para comparação (apenas a data, sem horário)
          const complaintDateOnly = new Date(complaintDate.getFullYear(), complaintDate.getMonth(), complaintDate.getDate());
          
          let matchesDateFilter = true;
          
          if (startDate) {
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            matchesDateFilter = matchesDateFilter && complaintDateOnly >= startDateOnly;
          }
          
          if (endDate) {
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            matchesDateFilter = matchesDateFilter && complaintDateOnly <= endDateOnly;
          }
          
          return matchesDateFilter;
        });
      }

      if (complaintsToExport.length === 0) {
        const message = startDate || endDate 
          ? "Nenhuma denúncia encontrada no histórico para o período selecionado. Verifique as datas ou remova os filtros."
          : "Nenhuma denúncia encontrada no histórico.";
        
        toast({
          title: "Aviso",
          description: message,
          variant: "destructive",
        });
        return;
      }

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
          
          // Posicionar o título ao lado da logo, não em cima
          pdf.setFontSize(18);
          pdf.text('RELATÓRIO DE DENÚNCIAS - HISTÓRICO', 60, 20);
          yPosition = 50; // Aumentar a posição Y para dar espaço à logo
        } catch (logoError) {
          console.error('Erro ao carregar logo:', logoError);
          pdf.setFontSize(18);
          pdf.text('RELATÓRIO DE DENÚNCIAS - HISTÓRICO', 20, 20);
          yPosition = 30;
        }
      } else {
        pdf.setFontSize(18);
        pdf.text('RELATÓRIO DE DENÚNCIAS - HISTÓRICO', 20, 20);
        yPosition = 30;
      }
      
      // Adicionar informações do relatório
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const today = new Date();
      const dateRange = startDate && endDate 
        ? `${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`
        : startDate 
        ? `A partir de ${format(startDate, 'dd/MM/yyyy')}`
        : endDate
        ? `Até ${format(endDate, 'dd/MM/yyyy')}`
        : 'Todas as datas';
      
      pdf.text(`Período: ${dateRange}`, 20, yPosition + 5);
      pdf.text(`Data de geração: ${format(today, 'dd/MM/yyyy HH:mm')}`, 20, yPosition + 15);
      pdf.text(`Total de denúncias: ${complaintsToExport.length}`, 20, yPosition + 25);
      
      yPosition += 40;

      // Configurar tabela usando autoTable
      const tableColumns = [
        'Denunciante',
        'Telefone',
        'Ocorrência',
        'Endereço',
        'Status',
        'Data Recebida',
        'Atendente'
      ];
      
      const tableRows = complaintsToExport.map(complaint => [
        complaint.complainant_name,
        complaint.complainant_phone,
        complaint.occurrence_type,
        `${complaint.occurrence_address}, ${complaint.occurrence_neighborhood}`,
        complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1),
        format(new Date(complaint.created_at), 'dd/MM/yyyy'),
        complaint.status === 'finalizada' 
          ? (complaint as any).archived_by_user?.full_name || '-'
          : (complaint as any).attendant?.full_name || '-'
      ]);

      // Adicionar tabela
      autoTable(pdf, {
        head: [tableColumns],
        body: tableRows,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Denunciante
          1: { cellWidth: 20 }, // Telefone
          2: { cellWidth: 25 }, // Ocorrência
          3: { cellWidth: 35 }, // Endereço
          4: { cellWidth: 20 }, // Status
          5: { cellWidth: 20 }, // Data
          6: { cellWidth: 25 }, // Atendente
        },
        margin: { left: 20, right: 20 },
      });

      // Salvar PDF
      const fileName = `relatorio-denuncias-${format(today, 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro detalhado ao exportar PDF:', error);
      const errorMessage = error.message || 'Erro desconhecido ao gerar relatório PDF';
      toast({
        title: "Erro",
        description: `Erro ao gerar relatório PDF: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    const colors = {
      nova: 'bg-yellow-500',
      cadastrada: 'bg-blue-500',
      finalizada: 'bg-green-500',
      a_verificar: 'bg-red-500',
      verificado: 'bg-purple-500'
    };
    
    const labels = {
      nova: 'Nova',
      cadastrada: 'Cadastrada',
      finalizada: 'Finalizada',
      a_verificar: 'A Verificar',
      verificado: 'Verificado'
    };

    return (
      <Badge className={`${colors[status]} text-white`}>
        {labels[status]}
      </Badge>
    );
  };

  // Filter complaints based on search term
  const filteredComplaints = complaints.filter(complaint =>
    complaint.complainant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.occurrence_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.classification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando denúncias...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, endereço ou classificação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Campo de pesquisa de CNPJ - para todos os perfis */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Consultar CNPJ:</span>
            
            <Input
              placeholder="Digite o CNPJ..."
              value={cnpjSearch}
              onChange={(e) => setCnpjSearch(e.target.value)}
              className="w-[200px]"
              maxLength={18}
            />
            
            <Button 
              onClick={searchCnpj}
              disabled={cnpjLoading}
              variant="default"
            >
              {cnpjLoading ? "Consultando..." : "Consultar"}
            </Button>
          </div>
        </div>
        
        {/* Para admin/super_admin: Filtros de Data para PDF */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Filtros para PDF:</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
                className="text-sm"
              >
                Limpar
              </Button>
            </div>

            <Button onClick={exportComplaintsPDF} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="novas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="novas">Novas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        
        {/* Tab Novas */}
        <TabsContent value="novas">
          <Card>
            <CardHeader>
              <CardTitle>Denúncias Novas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denunciante</TableHead>
                    <TableHead>Ocorrência</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Recebida</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints
                    .filter(complaint => {
                      // Para admin e super_admin, mostrar "nova", "a_verificar" e "verificado" na aba Novas
                      if (userRole === 'admin' || userRole === 'super_admin') {
                        return complaint.status === 'nova' || complaint.status === 'a_verificar' || complaint.status === 'verificado';
                      }
                      // Para atendentes, mostrar "nova" e "verificado"
                      return complaint.status === 'nova' || complaint.status === 'verificado';
                    })
                    .map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{complaint.complainant_name}</div>
                          <div className="text-sm text-gray-500">{complaint.complainant_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{complaint.occurrence_type}</div>
                          <div className="text-sm text-gray-500">{complaint.classification}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{complaint.occurrence_address}</div>
                          <div className="text-sm text-gray-500">{complaint.occurrence_neighborhood}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      <TableCell>
                        <div>
                          <div>{new Date(complaint.created_at).toLocaleDateString('pt-BR')}</div>
                          <div className="text-sm text-gray-500">{new Date(complaint.created_at).toLocaleTimeString('pt-BR')}</div>
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setSelectedComplaint(complaint)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detalhes da Denúncia</DialogTitle>
                                </DialogHeader>
                               {selectedComplaint && (
                                 <div className="space-y-6">
                                   <div className="space-y-4">
                                     <h3 className="text-lg font-semibold">Dados do Denunciante</h3>
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <strong>Nome:</strong> {selectedComplaint.complainant_name}
                                       </div>
                                       <div>
                                         <strong>Telefone:</strong> {selectedComplaint.complainant_phone}
                                       </div>
                                       <div>
                                         <strong>Tipo:</strong> {selectedComplaint.complainant_type}
                                       </div>
                                       <div>
                                         <strong>Bairro:</strong> {selectedComplaint.complainant_neighborhood}
                                       </div>
                                     </div>
                                     
                                     <div>
                                       <strong>Endereço:</strong> {selectedComplaint.complainant_address}
                                       {selectedComplaint.complainant_number && ` nº ${selectedComplaint.complainant_number}`}
                                       {selectedComplaint.complainant_block && `, Quadra ${selectedComplaint.complainant_block}`}
                                       {selectedComplaint.complainant_lot && `, Lote ${selectedComplaint.complainant_lot}`}
                                     </div>
                                   </div>

                                   <div className="space-y-4">
                                     <h3 className="text-lg font-semibold">Endereço da Ocorrência</h3>
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                       </div>
                                       <div>
                                         <strong>Bairro:</strong> {selectedComplaint.occurrence_neighborhood}
                                       </div>
                                     </div>
                                     
                                     <div>
                                       <strong>Endereço:</strong> {selectedComplaint.occurrence_address}
                                       {selectedComplaint.occurrence_number && ` nº ${selectedComplaint.occurrence_number}`}
                                       {selectedComplaint.occurrence_block && `, Quadra ${selectedComplaint.occurrence_block}`}
                                       {selectedComplaint.occurrence_lot && `, Lote ${selectedComplaint.occurrence_lot}`}
                                     </div>
                                     
                                     {selectedComplaint.occurrence_reference && (
                                       <div>
                                         <strong>Referência:</strong> {selectedComplaint.occurrence_reference}
                                       </div>
                                     )}
                                   </div>

                                   <div className="space-y-4">
                                     <h3 className="text-lg font-semibold">Dados da Reclamação</h3>
                                     
                                      <div>
                                        <strong>Narrativa:</strong>
                                        <p className="mt-2 p-3 bg-gray-50 rounded-md">{selectedComplaint.narrative}</p>
                                      </div>

                                      {/* Seção de Mídias */}
                                      {(selectedComplaint.photos?.length || selectedComplaint.videos?.length) && (
                                        <div className="space-y-3">
                                          <strong>Mídias Anexadas:</strong>
                                          
                                          {/* Fotos */}
                                          {selectedComplaint.photos && selectedComplaint.photos.length > 0 && (
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <Image className="h-4 w-4" />
                                                Fotos ({selectedComplaint.photos.length})
                                              </div>
                                               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                 {selectedComplaint.photos.map((photo, index) => (
                                                   <div key={index} className="relative group">
                                                     <img 
                                                       src={photo} 
                                                       alt={`Foto ${index + 1}`} 
                                                       className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                                       onClick={() => openMediaModal(selectedComplaint.photos!, index, 'photo')}
                                                     />
                                                   </div>
                                                 ))}
                                               </div>
                                            </div>
                                          )}

                                          {/* Vídeos */}
                                          {selectedComplaint.videos && selectedComplaint.videos.length > 0 && (
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <Video className="h-4 w-4" />
                                                Vídeos ({selectedComplaint.videos.length})
                                              </div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                 {selectedComplaint.videos.map((video, index) => (
                                                   <div key={index} className="relative cursor-pointer group">
                                                     <video 
                                                       src={video} 
                                                       className="w-full h-32 object-cover rounded border"
                                                       preload="metadata"
                                                     />
                                                     <div 
                                                       className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                                       onClick={() => openMediaModal(selectedComplaint.videos!, index, 'video')}
                                                     >
                                                       <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                                         <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"></div>
                                                       </div>
                                                     </div>
                                                   </div>
                                                 ))}
                                               </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <strong>Classificação:</strong> {selectedComplaint.classification}
                                       </div>
                                       {selectedComplaint.assigned_to && (
                                         <div>
                                           <strong>Atribuído a:</strong> {selectedComplaint.assigned_to}
                                         </div>
                                       )}
                                     </div>
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <strong>Status:</strong> {selectedComplaint.status}
                                       </div>
                                       {selectedComplaint.system_identifier && (
                                         <div>
                                           <strong>Identificador do Sistema:</strong> {selectedComplaint.system_identifier}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                   
                                    {/* Formulário RAI - mostrar para atendente e denúncia nova ou verificada */}
                                    {userRole === 'atendente' && (selectedComplaint.status === 'nova' || selectedComplaint.status === 'verificado') && (
                                     <div className="space-y-4 border-t pt-4">
                                       <h4 className="text-md font-semibold text-primary">Cadastrar com RAI</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                         <div>
                                           <Label htmlFor="rai-input">Número RAI *</Label>
                                           <Input
                                             id="rai-input"
                                             type="text"
                                             placeholder="Digite o número RAI"
                                             value={raiData.rai}
                                             onChange={(e) => setRaiData(prev => ({ ...prev, rai: e.target.value }))}
                                           />
                                         </div>
                                         <div>
                                           <Label htmlFor="classification-select">Classificação *</Label>
                                           <Select 
                                             value={raiData.classification} 
                                             onValueChange={(value) => setRaiData(prev => ({ ...prev, classification: value }))}
                                           >
                                             <SelectTrigger>
                                               <SelectValue placeholder="Selecione uma classificação..." />
                                             </SelectTrigger>
                                             <SelectContent>
                                               {classifications.map((classification) => (
                                                 <SelectItem key={classification} value={classification}>
                                                   {classification}
                                                 </SelectItem>
                                               ))}
                                             </SelectContent>
                                           </Select>
                                         </div>
                                       </div>
                                     </div>
                                   )}

                                     <div className="flex flex-wrap gap-2 pt-4 border-t">
                                       {/* Botões para ATENDENTE com denúncia NOVA */}
                                       {userRole === 'atendente' && selectedComplaint.status === 'nova' && (
                                        <>
                                          <Button 
                                            onClick={() => sendToAdmin(selectedComplaint.id)}
                                            variant="secondary"
                                          >
                                            <Send className="h-4 w-4 mr-2" />
                                            Enviar para Admin
                                          </Button>
                                          
                                          <Button 
                                            onClick={() => {
                                              if (!raiData.rai.trim()) {
                                                toast({
                                                  title: "Erro",
                                                  description: "Por favor, digite o número RAI",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                              
                                              if (!raiData.classification) {
                                                toast({
                                                  title: "Erro", 
                                                  description: "Por favor, selecione uma classificação",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                              
                                              updateComplaintStatus(selectedComplaint.id, 'cadastrada', raiData.rai);
                                              setRaiData({ rai: '', classification: '' });
                                            }}
                                            variant="default"
                                          >
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Cadastrar com RAI
                                          </Button>
                                        </>
                                      )}

                                       {/* Botões para ATENDENTE com denúncia VERIFICADA */}
                                       {userRole === 'atendente' && selectedComplaint.status === 'verificado' && (
                                        <Button 
                                          onClick={() => {
                                            if (!raiData.rai.trim()) {
                                              toast({
                                                title: "Erro",
                                                description: "Por favor, digite o número RAI",
                                                variant: "destructive",
                                              });
                                              return;
                                            }
                                            
                                            if (!raiData.classification) {
                                              toast({
                                                title: "Erro", 
                                                description: "Por favor, selecione uma classificação",
                                                variant: "destructive",
                                              });
                                              return;
                                            }
                                            
                                            updateComplaintStatus(selectedComplaint.id, 'cadastrada', raiData.rai);
                                            setRaiData({ rai: '', classification: '' });
                                          }}
                                          variant="default"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Cadastrar com RAI
                                        </Button>
                                      )}
                                       
                                      {/* Botões para ADMIN/SUPER_ADMIN com denúncia A_VERIFICAR */}
                                      {(userRole === 'admin' || userRole === 'super_admin') && selectedComplaint.status === 'a_verificar' && (
                                        <>
                                          <Button 
                                            onClick={() => archiveComplaint(selectedComplaint.id)}
                                            variant="destructive"
                                          >
                                            <Archive className="h-4 w-4 mr-2" />
                                            Arquivar
                                          </Button>
                                          
                                          <Button 
                                            onClick={() => markAsVerified(selectedComplaint.id)}
                                            variant="default"
                                          >
                                            <Check className="h-4 w-4 mr-2" />
                                            Verificado
                                          </Button>
                                        </>
                                      )}
                                     
                                      {/* Botão para SUPER_ADMIN */}
                                      {userRole === 'super_admin' && (
                                        <Button onClick={() => sendWhatsAppMessage(selectedComplaint)}>
                                          <MessageSquare className="h-4 w-4 mr-2" />
                                          Enviar WhatsApp
                                        </Button>
                                      )}
                                     </div>
                                 </div>
                               )}
                               </DialogContent>
                             </Dialog>
                            
                            {userRole === 'atendente' && complaint.status === 'nova' && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => sendToAdmin(complaint.id)}
                                title="Enviar para Admin"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Enviar
                              </Button>
                            )}
                            
                        </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
       </TabsContent>

       {/* Tab Histórico */}
       <TabsContent value="historico">
         <Card>
           <CardHeader>
             <CardTitle>Histórico de Denúncias</CardTitle>
           </CardHeader>
           <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Denunciante</TableHead>
                   <TableHead>Ocorrência</TableHead>
                   <TableHead>Endereço</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Data Recebida</TableHead>
                   <TableHead>Data Cadastro</TableHead>
                   <TableHead>Atendente</TableHead>
                   <TableHead>Ações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredComplaints
                   .filter(complaint => {
                     // Excluir "nova" e "verificado" da aba histórico
                     if (complaint.status === 'nova' || complaint.status === 'verificado') return false;
                     // Para admin e super_admin, excluir "a_verificar" do histórico (pois aparece em Novas)
                     if ((userRole === 'admin' || userRole === 'super_admin') && complaint.status === 'a_verificar') return false;
                     // Para atendentes, ocultar denúncias "A Verificar" e "finalizada"
                     if (userRole === 'atendente' && (complaint.status === 'a_verificar' || complaint.status === 'finalizada')) return false;
                     return true;
                   })
                   .map((complaint) => (
                   <TableRow key={complaint.id}>
                     <TableCell>
                       <div>
                         <div className="font-medium">{complaint.complainant_name}</div>
                         <div className="text-sm text-gray-500">{complaint.complainant_phone}</div>
                       </div>
                     </TableCell>
                     <TableCell>
                       <div>
                         <div>{complaint.occurrence_type}</div>
                         <div className="text-sm text-gray-500">{complaint.classification}</div>
                       </div>
                     </TableCell>
                     <TableCell>
                       <div>
                         <div>{complaint.occurrence_address}</div>
                         <div className="text-sm text-gray-500">{complaint.occurrence_neighborhood}</div>
                       </div>
                     </TableCell>
                     <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                     <TableCell>
                       <div>
                         <div>{new Date(complaint.created_at).toLocaleDateString('pt-BR')}</div>
                         <div className="text-sm text-gray-500">{new Date(complaint.created_at).toLocaleTimeString('pt-BR')}</div>
                       </div>
                     </TableCell>
                     <TableCell>
                       {complaint.processed_at ? (
                         <div>
                           <div>{new Date(complaint.processed_at).toLocaleDateString('pt-BR')}</div>
                           <div className="text-sm text-gray-500">{new Date(complaint.processed_at).toLocaleTimeString('pt-BR')}</div>
                         </div>
                       ) : (
                         <span className="text-gray-400">-</span>
                       )}
                     </TableCell>
                       <TableCell>
                         {complaint.status === 'finalizada' ? (
                           // Para denúncias finalizadas, mostrar quem arquivou
                           (complaint as any).archived_by_user?.full_name ? (
                             <span className="text-sm">{(complaint as any).archived_by_user.full_name}</span>
                           ) : (
                             <span className="text-gray-400">-</span>
                           )
                         ) : (
                           // Para outras denúncias, mostrar quem cadastrou
                           (complaint as any).attendant?.full_name ? (
                             <span className="text-sm">{(complaint as any).attendant.full_name}</span>
                           ) : (
                             <span className="text-gray-400">-</span>
                           )
                         )}
                       </TableCell>
                     <TableCell>
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={() => setSelectedComplaint(complaint)}
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             Ver
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                           <DialogHeader>
                             <DialogTitle>Detalhes da Denúncia</DialogTitle>
                           </DialogHeader>
                            {selectedComplaint && (
                              <div className="space-y-6">
                                {/* Informações do topo para histórico */}
                                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <strong>Data Recebida:</strong>
                                    <div>{new Date(selectedComplaint.created_at).toLocaleDateString('pt-BR')}</div>
                                    <div className="text-sm text-gray-500">{new Date(selectedComplaint.created_at).toLocaleTimeString('pt-BR')}</div>
                                  </div>
                                  <div>
                                    <strong>Data Cadastrada:</strong>
                                    {selectedComplaint.processed_at ? (
                                      <div>
                                        <div>{new Date(selectedComplaint.processed_at).toLocaleDateString('pt-BR')}</div>
                                        <div className="text-sm text-gray-500">{new Date(selectedComplaint.processed_at).toLocaleTimeString('pt-BR')}</div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>Atendente:</strong>
                                    <div>
                                      {(selectedComplaint as any).attendant?.full_name || 'Não informado'}
                                    </div>
                                  </div>
                                </div>
                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold">Dados do Denunciante</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                     <strong>Nome:</strong> {selectedComplaint.complainant_name}
                                   </div>
                                   <div>
                                     <strong>Telefone:</strong> {selectedComplaint.complainant_phone}
                                   </div>
                                   <div>
                                     <strong>Tipo:</strong> {selectedComplaint.complainant_type}
                                   </div>
                                   <div>
                                     <strong>Bairro:</strong> {selectedComplaint.complainant_neighborhood}
                                   </div>
                                 </div>
                                 
                                 <div>
                                   <strong>Endereço:</strong> {selectedComplaint.complainant_address}
                                   {selectedComplaint.complainant_number && ` nº ${selectedComplaint.complainant_number}`}
                                   {selectedComplaint.complainant_block && `, Quadra ${selectedComplaint.complainant_block}`}
                                   {selectedComplaint.complainant_lot && `, Lote ${selectedComplaint.complainant_lot}`}
                                 </div>
                               </div>

                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold">Endereço da Ocorrência</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                     <strong>Tipo de Ocorrência:</strong> {selectedComplaint.occurrence_type}
                                   </div>
                                   <div>
                                     <strong>Bairro:</strong> {selectedComplaint.occurrence_neighborhood}
                                   </div>
                                 </div>
                                 
                                 <div>
                                   <strong>Endereço:</strong> {selectedComplaint.occurrence_address}
                                   {selectedComplaint.occurrence_number && ` nº ${selectedComplaint.occurrence_number}`}
                                   {selectedComplaint.occurrence_block && `, Quadra ${selectedComplaint.occurrence_block}`}
                                   {selectedComplaint.occurrence_lot && `, Lote ${selectedComplaint.occurrence_lot}`}
                                 </div>
                                 
                                 {selectedComplaint.occurrence_reference && (
                                   <div>
                                     <strong>Referência:</strong> {selectedComplaint.occurrence_reference}
                                   </div>
                                 )}
                               </div>

                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold">Dados da Reclamação</h3>
                                 
                                 <div>
                                   <strong>Narrativa:</strong>
                                   <p className="mt-2 p-3 bg-gray-50 rounded-md">{selectedComplaint.narrative}</p>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                     <strong>Classificação:</strong> {selectedComplaint.classification}
                                   </div>
                                   {selectedComplaint.assigned_to && (
                                     <div>
                                       <strong>Atribuído a:</strong> {selectedComplaint.assigned_to}
                                     </div>
                                   )}
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                     <strong>Status:</strong> {selectedComplaint.status}
                                   </div>
                                   {selectedComplaint.system_identifier && (
                                     <div>
                                       <strong>Identificador do Sistema:</strong> {selectedComplaint.system_identifier}
                                     </div>
                                   )}
                                 </div>
                               </div>
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
       </TabsContent>
     </Tabs>

     {filteredComplaints.length === 0 && (
       <div className="text-center py-8 text-gray-500">
         Nenhuma denúncia encontrada com os filtros aplicados.
       </div>
     )}

      {/* Modal de dados do CNPJ */}
      <Dialog open={cnpjModalOpen} onOpenChange={setCnpjModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados do CNPJ</DialogTitle>
          </DialogHeader>
          
          {cnpjData && (
            <div className="space-y-6">
              {/* Dados principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dados da Empresa</h3>
                  <div className="space-y-2">
                    <div><strong>CNPJ:</strong> {cnpjData.cnpj}</div>
                    <div><strong>Razão Social:</strong> {cnpjData.nome}</div>
                    <div><strong>Nome Fantasia:</strong> {cnpjData.fantasia || 'Não informado'}</div>
                    <div><strong>Situação:</strong> {cnpjData.situacao}</div>
                    <div><strong>Data de Abertura:</strong> {cnpjData.abertura}</div>
                    <div><strong>Porte:</strong> {cnpjData.porte}</div>
                    <div><strong>Natureza Jurídica:</strong> {cnpjData.natureza_juridica}</div>
                    <div><strong>Capital Social:</strong> {cnpjData.capital_social}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Contato e Endereço</h3>
                  <div className="space-y-2">
                    <div><strong>Telefone:</strong> {cnpjData.telefone || 'Não informado'}</div>
                    <div><strong>Email:</strong> {cnpjData.email || 'Não informado'}</div>
                    <div><strong>Endereço:</strong> {cnpjData.logradouro}, {cnpjData.numero}</div>
                    <div><strong>Complemento:</strong> {cnpjData.complemento || 'Não informado'}</div>
                    <div><strong>Bairro:</strong> {cnpjData.bairro}</div>
                    <div><strong>Município:</strong> {cnpjData.municipio}</div>
                    <div><strong>UF:</strong> {cnpjData.uf}</div>
                    <div><strong>CEP:</strong> {cnpjData.cep}</div>
                  </div>
                </div>
              </div>

              {/* Atividades */}
              {(cnpjData.atividade_principal || (cnpjData.atividades_secundarias && cnpjData.atividades_secundarias.length > 0)) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Atividades</h3>
                  <div className="space-y-2">
                    {cnpjData.atividade_principal && (
                      <div>
                        <strong>Principal:</strong> {cnpjData.atividade_principal[0]?.code} - {cnpjData.atividade_principal[0]?.text}
                      </div>
                    )}
                    
                    {cnpjData.atividades_secundarias && cnpjData.atividades_secundarias.length > 0 && (
                      <div>
                        <strong>Secundárias:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          {cnpjData.atividades_secundarias.map((atividade: any, index: number) => (
                            <li key={index} className="text-sm">
                              {atividade.code} - {atividade.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botão para exportar PDF */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={exportCnpjToPDF} variant="default">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de mídia */}
      <MediaModal
        isOpen={mediaModal.isOpen}
        onClose={closeMediaModal}
        media={mediaModal.media}
        initialIndex={mediaModal.initialIndex}
        type={mediaModal.type}
      />

    </div>
  );
};