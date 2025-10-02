import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Download, MessageSquare, Calendar, Send, Archive, Check, CalendarIcon, Image, Video, Play, AlertCircle, UserCheck, RefreshCw, Smartphone, Search } from 'lucide-react';
import { MediaModal } from "@/components/ui/media-modal";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useComplaintsFilter } from '@/hooks/useComplaintsFilter';
import { useLazyRender } from '@/hooks/useLazyRender';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type ComplaintStatus = 'nova' | 'cadastrada' | 'finalizada' | 'a_verificar' | 'verificado' | 'fiscal_solicitado';

// ... keep existing code (interfaces and types)

// Componente para preview de vídeo com fallback
interface VideoPreviewProps {
  video: string;
  index: number;
  onOpenModal: () => void;
}

const VideoPreview = ({ video, index, onOpenModal }: VideoPreviewProps) => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // REMOVIDO: Log de vídeo por segurança

  // Função para detectar o formato do vídeo
  const getVideoFormat = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  // Função para verificar se o formato é suportado pelo navegador
  const isFormatSupported = (url: string) => {
    const video = document.createElement('video');
    const format = getVideoFormat(url);
    
    switch (format) {
      case 'mp4':
        return video.canPlayType('video/mp4') !== '';
      case 'webm':
        return video.canPlayType('video/webm') !== '';
      case 'ogg':
        return video.canPlayType('video/ogg') !== '';
      case 'mov':
      case 'quicktime':
        return video.canPlayType('video/quicktime') !== '';
      case 'avi':
        return video.canPlayType('video/x-msvideo') !== '';
      default:
        return false;
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    // Erro ao carregar vídeo
    setVideoError(true);
  };

  const handleVideoLoaded = () => {
    // Vídeo carregado com sucesso
    setVideoLoaded(true);
  };

  const videoFormat = getVideoFormat(video);
  const formatSupported = isFormatSupported(video);

  return (
    <div className="relative cursor-pointer group border rounded overflow-hidden bg-gray-100">
      {!videoError && formatSupported ? (
        <>
          <video 
            src={video} 
            className="w-full h-32 object-cover"
            preload="metadata"
            muted
            onError={handleVideoError}
            onLoadedMetadata={handleVideoLoaded}
            onCanPlay={handleVideoLoaded}
          />
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-200 text-gray-500">
          <Video className="h-8 w-8 mb-2" />
          <span className="text-xs text-center px-2 font-medium">
            Vídeo {videoFormat.toUpperCase()}
          </span>
          <span className="text-xs text-center px-2 text-gray-400">
            {!formatSupported ? 'Formato não suportado' : 'Erro no carregamento'}
          </span>
        </div>
      )}
      
      <div 
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        onClick={onOpenModal}
      >
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <Play className="h-4 w-4 text-white ml-0.5" />
        </div>
      </div>
      
      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
        {videoFormat.toUpperCase()}
      </div>
    </div>
  );
};

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
  
  // Dados do usuário capturados
  user_location?: any; // JSON data from database
  user_device_type?: string;
  user_browser?: string;
  user_ip?: string;
  user_agent?: string;
  
  // Controle interno
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  attendant_id?: string;
  system_identifier?: string;
  whatsapp_sent?: boolean;
}

interface DuplicateInfo {
  isDuplicate: boolean;
  sequence: number;
  isLatest: boolean;
  totalCount: number;
}

export const ComplaintsList = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [deviceFilter, setDeviceFilter] = useState('todos');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [raiData, setRaiData] = useState({ rai: '', classification: '' });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [activeTab, setActiveTab] = useState('novas');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [cnpjSearch, setCnpjSearch] = useState<string>('');
  const [cnpjData, setCnpjData] = useState<any>(null);
  
  // Debounce search para melhorar performance
  const debouncedSearch = useDebounce(searchTerm, 300);
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
  const [apiResponseModal, setApiResponseModal] = useState<{
    isOpen: boolean;
    response: any;
    isSuccess: boolean;
  }>({
    isOpen: false,
    response: null,
    isSuccess: false
  });
  const [sendingToSystem, setSendingToSystem] = useState(false);
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

  // Realtime simplificado (somente desktop, sem auto-refresh)
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android|Tablet|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (isMobile) return;
    
    const channel = supabase
      .channel('complaints-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload) => {
          const newComplaint = payload.new as Complaint;
          const shouldShow = userRole === 'super_admin' || userRole === 'admin' || 
                           (userRole === 'atendente' && newComplaint.status !== 'a_verificar' && newComplaint.status !== 'finalizada');
          
          if (shouldShow) {
            setComplaints(prev => {
              if (prev.some(c => c.id === newComplaint.id)) return prev;
              return [newComplaint, ...prev];
            });
            
            if (newComplaint.status === 'nova' && soundEnabled) {
              playNotificationSound();
            }
            
            toast({
              title: "Nova Denúncia",
              description: `Denúncia de ${newComplaint.complainant_name}`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'complaints' },
        (payload) => {
          const updated = payload.new as Complaint;
          setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, soundEnabled]);

  const setupRealtimeUpdates = () => {
    // Configurando realtime
    
    const channel = supabase
      .channel(`complaints-realtime-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaints'
        },
        (payload) => {
          // REMOVIDO: Log de nova denúncia por segurança
          
          const newComplaint = payload.new as any;
          
          // Verificar se a denúncia deve ser exibida para este usuário
          const shouldShow = userRole === 'super_admin' || userRole === 'admin' || 
                           (userRole === 'atendente' && newComplaint.status !== 'a_verificar' && newComplaint.status !== 'finalizada');
          
          // REMOVIDO: Log de should show por segurança
          
          if (shouldShow) {
            // Adicionando nova denúncia à lista
            
            // Adicionar imediatamente à lista em tempo real
            setComplaints(prevComplaints => {
              // Verificar se já existe para evitar duplicatas
              const exists = prevComplaints.some(c => c.id === newComplaint.id);
              if (exists) return prevComplaints;
              
              // Adicionar no início da lista
              return [newComplaint as Complaint, ...prevComplaints];
            });
            
            // Tocar som se for uma denúncia nova
            if (newComplaint.status === 'nova' && soundEnabled) {
              // Tocando som para nova denúncia
              playNotificationSound();
            }
            
            // Mostrar toast de notificação
            toast({
              title: "Nova Denúncia Recebida",
              description: `Denúncia de ${newComplaint.complainant_name} foi registrada no sistema`,
              duration: 8000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'complaints'
        },
        (payload) => {
          // REMOVIDO: Log de denúncia atualizada por segurança
          
          const updatedComplaint = payload.new as Complaint;
          
          // Atualizar a denúncia na lista
          setComplaints(prevComplaints => 
            prevComplaints.map(complaint => 
              complaint.id === updatedComplaint.id ? updatedComplaint : complaint
            ).filter(complaint => {
              // Filtrar denúncias que não devem mais ser visíveis para atendentes
              if (userRole === 'atendente') {
                return complaint.status !== 'finalizada' && complaint.status !== 'a_verificar';
              }
              return true;
            })
          );
          
          // Mostrar toast para atualizações importantes
          if (payload.old && payload.new && payload.old.status !== payload.new.status) {
            toast({
              title: "Status Atualizado",
              description: `Denúncia de ${updatedComplaint.complainant_name} teve status alterado para ${updatedComplaint.status}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe(
        (status) => {
          // Conexão realtime estabelecida
          if (status === 'SUBSCRIBED') {
            // Conectado ao realtime com sucesso
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Erro na conexão realtime');
          }
        }
      );

    return channel;
  };

  const refetch = async () => {
    try {
      // Recarregando denúncias
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          attendant:users!complaints_attendant_id_fkey(full_name),
          archived_by_user:users!complaints_archived_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('❌ Erro na query refetch:', error);
        throw error;
      }
      
      // REMOVIDO: Log de refetch data por segurança
      // REMOVIDO: Log de userRole por segurança
      // REMOVIDO: Log de profile role por segurança
      
      // Apply the same filtering logic as fetchComplaints
      let filteredData = data || [];
      
      if (profile?.role === 'atendente') {
        filteredData = data?.filter(complaint => 
          complaint.status !== 'finalizada' && complaint.status !== 'a_verificar'
        ) || [];
        // REMOVIDO: Log de filtered data por segurança
      }
      
      setComplaints(filteredData as Complaint[]);
    } catch (error) {
      console.error('❌ Erro ao recarregar denúncias:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar lista de denúncias",
        variant: "destructive",
      });
    }
  };

  // Função para atualização manual
  const handleManualRefresh = async () => {
    toast({
      title: "Atualizando",
      description: "Atualizando lista de denúncias...",
    });
    await fetchComplaints();
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          attendant:users!complaints_attendant_id_fkey(full_name),
          archived_by_user:users!complaints_archived_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500); // Limitar para evitar carregar todos os dados

      if (error) {
        toast({
          title: "Erro",
          description: `Erro ao carregar denúncias: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }
      
      let filteredData = data || [];
      
      if (profile?.role === 'atendente') {
        filteredData = data?.filter(complaint => 
          complaint.status !== 'finalizada' && complaint.status !== 'a_verificar'
        ) || [];
      }
      
      setComplaints(filteredData as Complaint[]);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar denúncias",
        variant: "destructive",
      });
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

  // Função para normalizar endereço para comparação
  const normalizeAddress = (complaint: Complaint): string => {
    const parts = [
      complaint.occurrence_address?.trim().toLowerCase(),
      complaint.occurrence_number?.trim(),
      complaint.occurrence_neighborhood?.trim().toLowerCase()
    ].filter(Boolean);
    return parts.join('-');
  };

  // Função para obter data em São Paulo timezone
  const getDateInSaoPaulo = (dateString: string): string => {
    const date = new Date(dateString);
    // Converter para timezone America/Sao_Paulo
    const saoPauloDate = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
    
    // Retornar no formato YYYY-MM-DD
    const [day, month, year] = saoPauloDate.split('/');
    return `${year}-${month}-${day}`;
  };

  // Função para detectar denúncias duplicadas
  const getDuplicateInfo = (complaint: Complaint, allComplaints: Complaint[]): DuplicateInfo => {
    const complaintDate = getDateInSaoPaulo(complaint.created_at);
    const complaintAddress = normalizeAddress(complaint);
    
    // Filtrar denúncias do mesmo dia e endereço
    const sameAddressSameDay = allComplaints.filter(c => {
      const cDate = getDateInSaoPaulo(c.created_at);
      const cAddress = normalizeAddress(c);
      return cDate === complaintDate && cAddress === complaintAddress;
    });

    // Ordenar por horário de criação
    sameAddressSameDay.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const isDuplicate = sameAddressSameDay.length > 1;
    const sequence = sameAddressSameDay.findIndex(c => c.id === complaint.id) + 1;
    const isLatest = sameAddressSameDay[sameAddressSameDay.length - 1].id === complaint.id;
    
    return {
      isDuplicate,
      sequence,
      isLatest,
      totalCount: sameAddressSameDay.length
    };
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
    // Tentando tocar som
    
    if (!soundEnabled) {
      // Som desabilitado nas configurações
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
            // Som tocado com sucesso
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
      console.log('=== INÍCIO DA ATUALIZAÇÃO ===');
      console.log('updateComplaintStatus called with:', { 
        id, 
        status, 
        systemIdentifier, 
        user: user?.id, 
        profile: profile?.id,
        userRole: profile?.role,
        raiData
      });
      
      // Verificar se temos autenticação
      const { data: authUser } = await supabase.auth.getUser();
      console.log('Auth user:', authUser?.user?.id);
      
      const userId = user?.id || profile?.id || authUser?.user?.id;
      
      if (!userId) {
        console.error('Nenhum ID de usuário encontrado');
        toast({
          title: "Erro",
          description: "Erro de autenticação. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const updateData: any = {
        status,
        attendant_id: userId,
        processed_at: new Date().toISOString(),
        classification: raiData.classification || ''
      };

      if (systemIdentifier) {
        updateData.system_identifier = systemIdentifier;
      }

      console.log('Update data:', updateData);
      console.log('Using user ID:', userId);
      console.log('Updating complaint ID:', id);

      // Primeiro verificar se a denúncia existe
      const { data: existingComplaint, error: selectError } = await supabase
        .from('complaints')
        .select('id, status, complainant_name')
        .eq('id', id)
        .single();

      if (selectError) {
        console.error('Erro ao buscar denúncia:', selectError);
        throw selectError;
      }

      console.log('Denúncia encontrada:', existingComplaint);

      // Fazer a atualização
      const { data, error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Erro detalhado ao atualizar denúncia:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Denúncia atualizada com sucesso:', data);
      
      // Verificar se a atualização foi persistida
      const { data: updatedComplaint, error: verifyError } = await supabase
        .from('complaints')
        .select('id, status, system_identifier, attendant_id')
        .eq('id', id)
        .single();

      if (verifyError) {
        console.error('Erro ao verificar atualização:', verifyError);
      } else {
        console.log('Verificação pós-atualização:', updatedComplaint);
      }
      
      toast({
        title: "Sucesso",
        description: `Denúncia ${status === 'cadastrada' ? 'cadastrada com PROTOCOLO' : 'atualizada'} com sucesso! Verifique na aba Histórico.`,
      });
      
      // Limpar dados do formulário
      setRaiData({ rai: '', classification: '' });
      setSelectedComplaint(null);
      
      // Forçar atualização da lista múltiplas vezes para garantir
      console.log('Forçando atualização da lista...');
      await fetchComplaints();
      
      // Aguardar um pouco e atualizar novamente para garantir
      setTimeout(async () => {
        console.log('Segunda atualização da lista...');
        await fetchComplaints();
      }, 1000);
      
      console.log('=== FIM DA ATUALIZAÇÃO ===');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar denúncia: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  const archiveComplaint = async (complaintId: string) => {
    try {
      // Atualização otimista: remove da lista imediatamente
      setComplaints(prev => prev.filter(c => c.id !== complaintId));
      setSelectedComplaint(null);
      
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
    } catch (error) {
      console.error('Erro ao arquivar denúncia:', error);
      // Se der erro, recarrega a lista
      fetchComplaints();
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
      // Filtrar denúncias do histórico (finalizada, cadastrada e fiscal_solicitado) - sempre usar histórico para PDF
      let complaintsToExport = complaints.filter(complaint => 
        complaint.status === 'finalizada' || complaint.status === 'cadastrada' || complaint.status === 'fiscal_solicitado'
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
      verificado: 'bg-purple-500',
      fiscal_solicitado: 'bg-orange-500'
    };
    
    const labels = {
      nova: 'Nova',
      cadastrada: 'Cadastrada',
      finalizada: 'Finalizada',
      a_verificar: 'A Verificar',
      verificado: 'Verificado',
      fiscal_solicitado: 'Fiscal Solicitado'
    };

    return (
      <Badge className={`${colors[status]} text-white`}>
        {labels[status]}
      </Badge>
    );
  };

  // Função para marcar como fiscal solicitado
  const markAsFiscalSolicitado = async (complaintId: string) => {
    try {
      console.log('Marking as fiscal solicitado:', { complaintId, userId: profile?.id, profileData: profile });
      
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'fiscal_solicitado' as any,
          attendant_id: profile?.id, // Usar profile?.id ao invés de user?.id
          processed_at: new Date().toISOString(), // Salvar quando foi marcado
          updated_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) {
        console.error('Error updating complaint:', error);
        throw error;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Denúncia marcada como fiscal já solicitado",
      });

      // Atualizar a lista
      fetchComplaints();
    } catch (error) {
      console.error('Erro ao marcar como fiscal solicitado:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar como fiscal solicitado",
        variant: "destructive",
      });
    }
  };

  // Use optimized filter hook with debounced search
  const { filteredComplaints, complaintsForNewTab, complaintsForHistoryTab } = useComplaintsFilter(complaints, {
    searchTerm: debouncedSearch, // Usar debounced ao invés de searchTerm direto
    deviceFilter,
    activeTab,
    startDate,
    endDate,
    userRole
  });

  // Lazy loading for performance
  const { 
    visibleItems: visibleNewComplaints, 
    hasMore: hasMoreNew, 
    loadMore: loadMoreNew 
  } = useLazyRender({ 
    items: complaintsForNewTab, 
    itemsPerPage: 20, 
    initialLoad: 15 
  });

  const { 
    visibleItems: visibleHistoryComplaints, 
    hasMore: hasMoreHistory, 
    loadMore: loadMoreHistory 
  } = useLazyRender({ 
    items: complaintsForHistoryTab, 
    itemsPerPage: 20, 
    initialLoad: 15 
  });

  // Get unique device types for filter
  const getUniqueDevices = () => {
    const devices = new Set<string>();
    complaints.forEach(complaint => {
      if (complaint.user_device_type) {
        devices.add(complaint.user_device_type.toLowerCase());
      }
    });
    return Array.from(devices).sort();
  };

  // Get device count with percentage for display
  const getDeviceCount = (deviceType: string) => {
    const total = complaints.length;
    let count = 0;
    
    if (deviceType === 'todos') {
      count = total;
    } else if (deviceType === 'não informado') {
      count = complaints.filter(c => !c.user_device_type).length;
    } else {
      count = complaints.filter(c => c.user_device_type?.toLowerCase() === deviceType.toLowerCase()).length;
    }
    
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1).replace('.', ',') : '0,0';
    return `(${count}) - ${percentage}%`;
  };

  // RENDER DEBUG: Component status updated

  if (loading) {
    return <div>Carregando denúncias...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, endereço ou classificação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleManualRefresh}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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

              {/* Botão Buscar - aparece quando há datas selecionadas */}
              {(startDate || endDate) && (
                <Button 
                  variant="default" 
                  onClick={() => {
                    // Toast para confirmar que o filtro foi aplicado
                    toast({
                      title: "Filtro Aplicado",
                      description: `Mostrando denúncias de ${startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'qualquer data'} até ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'qualquer data'}`,
                      duration: 3000,
                    });
                  }}
                  className="text-sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              )}

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
        
        {/* Para admin e super_admin: Filtro de Dispositivo */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Filtro por Dispositivo:</span>
              <Smartphone className="h-4 w-4" />
              
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    Todos ({getDeviceCount('todos')})
                  </SelectItem>
                  <SelectItem value="não informado">
                    Não informado ({getDeviceCount('não informado')})
                  </SelectItem>
                  {getUniqueDevices().map((device) => (
                    <SelectItem key={device} value={device}>
                      {device.charAt(0).toUpperCase() + device.slice(1)} ({getDeviceCount(device)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  {visibleNewComplaints
                     .map((complaint) => {
                       const duplicateInfo = getDuplicateInfo(complaint, complaints);
                      
                      return (
                    <TableRow 
                      key={complaint.id}
                      className={cn(
                        duplicateInfo.isDuplicate && "bg-red-50 border-red-200",
                        duplicateInfo.isLatest && duplicateInfo.isDuplicate && "animate-pulse"
                      )}
                    >
                       <TableCell>
                         <div>
                           <div className="font-medium flex items-center gap-2">
                             {complaint.complainant_name}
                             {duplicateInfo.isDuplicate && (
                               <Badge 
                                 variant="destructive" 
                                 className={cn(
                                   "text-xs",
                                   duplicateInfo.isLatest && "animate-pulse"
                                 )}
                               >
                                 {duplicateInfo.sequence}ª solicitação
                               </Badge>
                             )}
                           </div>
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
                                   onClick={() => {
                                     console.log('🔍 DEBUG onClick Ver (Novas) - Complaint selecionada:', complaint);
                                     console.log('🔍 DEBUG onClick Ver (Novas) - user_location:', complaint.user_location);
                                     console.log('🔍 DEBUG onClick Ver (Novas) - photos:', complaint.photos);
                                     console.log('🔍 DEBUG onClick Ver (Novas) - videos:', complaint.videos);
                                     setSelectedComplaint(complaint);
                                   }}
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
                                      <h3 className="text-lg font-semibold">Nome da Rua da Ocorrência</h3>
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
                                                  {selectedComplaint.videos.map((video, index) => {
                                                    console.log('Renderizando vídeo:', video, 'Index:', index);
                                                    return (
                                                      <VideoPreview 
                                                        key={index}
                                                        video={video}
                                                        index={index}
                                                        onOpenModal={() => openMediaModal(selectedComplaint.videos!, index, 'video')}
                                                      />
                                                    );
                                                  })}
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

                                     {/* Dados do Usuário Capturados */}
                                     {(() => {
                                       // Debug: Log da denúncia selecionada
                                       console.log('🔍 DEBUG Modal - Denúncia completa:', selectedComplaint);
                                       console.log('🔍 DEBUG Modal - user_location:', selectedComplaint.user_location);
                                       console.log('🔍 DEBUG Modal - Tipo user_location:', typeof selectedComplaint.user_location);
                                       
                                       const hasUserInfo = selectedComplaint.user_location || 
                                                         selectedComplaint.user_device_type || 
                                                         selectedComplaint.user_browser || 
                                                         selectedComplaint.user_ip || 
                                                         selectedComplaint.user_agent;
                                       
                                       console.log('🔍 DEBUG Modal - hasUserInfo:', hasUserInfo);
                                       return hasUserInfo;
                                     })() && (
                                       <div className="space-y-4">
                                         <h3 className="text-lg font-semibold">Informações do Usuário</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                           {selectedComplaint.user_device_type && (
                                             <div>
                                               <strong>Dispositivo:</strong> {selectedComplaint.user_device_type}
                                             </div>
                                           )}
                                           {selectedComplaint.user_browser && (
                                             <div>
                                               <strong>Navegador:</strong> {selectedComplaint.user_browser}
                                             </div>
                                           )}
                                           {selectedComplaint.user_ip && (
                                             <div>
                                               <strong>Endereço IP:</strong> {selectedComplaint.user_ip}
                                             </div>
                                           )}
                                            {selectedComplaint.user_location && (
                                              <div className="md:col-span-2">
                                                <strong>Localização:</strong>
                                                <div className="mt-1 text-sm bg-gray-50 p-2 rounded">
                                                  {(() => {
                                                    let latitude: number | null = null;
                                                    let longitude: number | null = null;
                                                    let accuracy: number | null = null;

                                                    console.log('🔍 DEBUG Modal - Processando localização:', selectedComplaint.user_location);

                                                    // Se é um objeto estruturado
                                                    if (typeof selectedComplaint.user_location === 'object' && selectedComplaint.user_location?.latitude) {
                                                      latitude = selectedComplaint.user_location.latitude;
                                                      longitude = selectedComplaint.user_location.longitude;
                                                      accuracy = selectedComplaint.user_location.accuracy;
                                                      console.log('🔍 DEBUG Modal - Objeto estruturado:', { latitude, longitude, accuracy });
                                                    }
                                                    // Se é uma string, tentar processar
                                                    else if (typeof selectedComplaint.user_location === 'string') {
                                                      console.log('🔍 DEBUG Modal - String localização:', selectedComplaint.user_location);
                                                      const lines = selectedComplaint.user_location.trim().split('\n');
                                                      console.log('🔍 DEBUG Modal - Lines:', lines);
                                                      if (lines.length === 2) {
                                                        latitude = parseFloat(lines[0]);
                                                        longitude = parseFloat(lines[1]);
                                                        console.log('🔍 DEBUG Modal - String parseada:', { latitude, longitude });
                                                      } else if (lines.length === 1) {
                                                        // Tentar com vírgula ou espaço
                                                        const parts = lines[0].split(/[,\s]+/);
                                                        if (parts.length >= 2) {
                                                          latitude = parseFloat(parts[0]);
                                                          longitude = parseFloat(parts[1]);
                                                          console.log('🔍 DEBUG Modal - String com separador:', { latitude, longitude });
                                                        }
                                                      }
                                                    }

                                                    console.log('🔍 DEBUG Modal - Resultado final:', { latitude, longitude, accuracy });

                                                    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                                                      return (
                                                        <>
                                                          <div>Latitude: {latitude}</div>
                                                          <div>Longitude: {longitude}</div>
                                                          {accuracy && (
                                                            <div>Precisão: {Math.round(accuracy)}m</div>
                                                          )}
                                                          <div className="mt-2">
                                                            <a 
                                                              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-blue-600 hover:text-blue-800 underline"
                                                            >
                                                              Ver no Google Maps
                                                            </a>
                                                          </div>
                                                        </>
                                                      );
                                                    } else {
                                                      return (
                                                        <div className="text-gray-500">
                                                          Dados de localização inválidos: {JSON.stringify(selectedComplaint.user_location)}
                                                        </div>
                                                      );
                                                    }
                                                  })()}
                                                </div>
                                              </div>
                                            )}
                                           {selectedComplaint.user_agent && (
                                             <div className="md:col-span-2">
                                               <strong>User Agent:</strong>
                                               <div className="mt-1 text-xs bg-gray-50 p-2 rounded break-all">
                                                 {selectedComplaint.user_agent}
                                               </div>
                                             </div>
                                           )}
                                         </div>
                                       </div>
                                     )}
                                    
                                    {/* Formulário RAI - mostrar para atendente e denúncia nova ou verificada */}
                                    {userRole === 'atendente' && (selectedComplaint.status === 'nova' || selectedComplaint.status === 'verificado') && (
                                     <div className="space-y-4 border-t pt-4">
                                       <h4 className="text-md font-semibold text-primary">Cadastrar com PROTOCOLO</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                         <div>
                                           <Label htmlFor="rai-input">Número PROTOCOLO *</Label>
                                           <Input
                                             id="rai-input"
                                             type="text"
                                             placeholder="Digite o número PROTOCOLO"
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
                                               console.log('Botão "Cadastrar com RAI" clicado!', { 
                                                 selectedComplaint: selectedComplaint?.id, 
                                                 raiData 
                                               });
                                               
                                               if (!raiData.rai.trim()) {
                                                 toast({
                                                   title: "Erro",
                                                    description: "Por favor, digite o número PROTOCOLO",
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
                                               
                                               console.log('Chamando updateComplaintStatus...');
                                               updateComplaintStatus(selectedComplaint.id, 'cadastrada', raiData.rai);
                                               setRaiData({ rai: '', classification: '' });
                                             }}
                                            variant="default"
                                          >
                                            <Calendar className="h-4 w-4 mr-2" />
                                             Cadastrar com PROTOCOLO
                                          </Button>
                                        </>
                                      )}

                                       {/* Botões para ATENDENTE com denúncia VERIFICADA */}
                                       {userRole === 'atendente' && selectedComplaint.status === 'verificado' && (
                                         <Button 
                                           onClick={() => {
                                             console.log('Botão "Cadastrar com RAI" (verificado) clicado!', { 
                                               selectedComplaint: selectedComplaint?.id, 
                                               raiData 
                                             });
                                             
                                             if (!raiData.rai.trim()) {
                                               toast({
                                                 title: "Erro",
                                                 description: "Por favor, digite o número PROTOCOLO",
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
                                             
                                             console.log('Chamando updateComplaintStatus...');
                                             updateComplaintStatus(selectedComplaint.id, 'cadastrada', raiData.rai);
                                             setRaiData({ rai: '', classification: '' });
                                           }}
                                          variant="default"
                                        >
                                          <Calendar className="h-4 w-4 mr-2" />
                                           Cadastrar com PROTOCOLO
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
                                     
                                       {/* Botões para SUPER_ADMIN */}
                                       {userRole === 'super_admin' && (
                                         <>
                                           <Button onClick={() => sendWhatsAppMessage(selectedComplaint)}>
                                             <MessageSquare className="h-4 w-4 mr-2" />
                                             Enviar WhatsApp
                                           </Button>
                                           
                             <Button 
                               onClick={async () => {
                                 try {
                                   setSendingToSystem(true);
                                   
                                   const { data, error } = await supabase.functions.invoke('posturas-bridge', {
                                     body: { 
                                       action: 'send',
                                       complaint_id: selectedComplaint.id 
                                     }
                                   });

                                   // Fechar o modal de detalhes ANTES de mostrar a resposta da API
                                   setSelectedComplaint(null);

                                   // Mostrar modal com resposta da API
                                   setApiResponseModal({
                                     isOpen: true,
                                     response: data || error,
                                     isSuccess: !error && data?.success
                                   });

                                   // Removido fetchComplaints para evitar recarregamento duplo; realtime (quando aplicável) cuidará da atualização da lista
                                   // if (!error && data?.success) {
                                   //   fetchComplaints();
                                   // }
                                 } catch (error) {
                                   console.error('Error sending to system:', error);
                                   // Fechar o modal de detalhes ANTES de mostrar o erro
                                   setSelectedComplaint(null);
                                   
                                   setApiResponseModal({
                                     isOpen: true,
                                     response: { error: 'Erro de conexão', details: error },
                                     isSuccess: false
                                   });
                                 } finally {
                                   setSendingToSystem(false);
                                 }
                               }}
                               variant="outline"
                               disabled={sendingToSystem}
                             >
                               <Send className="h-4 w-4 mr-2" />
                               {sendingToSystem ? "ENVIANDO..." : "ENVIAR PARA O SISTEMA"}
                             </Button>
                                         </>
                                       )}
                                     </div>
                                 </div>
                               )}
                               </DialogContent>
                             </Dialog>
                            
                             
                             {/* Botão para denúncias duplicadas (2ª solicitação em diante) */}
                             {userRole === 'atendente' && duplicateInfo.isDuplicate && duplicateInfo.sequence >= 2 && complaint.status === 'nova' && (
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button 
                                     size="sm" 
                                     variant="outline"
                                     title="Marcar como fiscal já solicitado"
                                     className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                   >
                                     <UserCheck className="h-4 w-4 mr-1" />
                                     Fiscal Solicitado
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Confirmar Solicitação ao Fiscal</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Você confirma que já foi feito o cadastro da solicitação e repassado ao fiscal para esta denúncia? 
                                       A denúncia será movida para o histórico com status "Fiscal Já Solicitado".
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction 
                                       onClick={() => markAsFiscalSolicitado(complaint.id)}
                                       className="bg-orange-500 hover:bg-orange-600"
                                     >
                                       Confirmar
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             )}
                            
                         </div>
                     </TableCell>
                   </TableRow>
                   );
                 })}
                </TableBody>
              </Table>
              
              {/* Botão Carregar Mais para aba Novas */}
              {hasMoreNew && (
                <div className="flex justify-center py-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMoreNew}
                    className="text-sm"
                  >
                    Carregar mais denúncias ({complaintsForNewTab.length - visibleNewComplaints.length} restantes)
                  </Button>
                </div>
              )}
            </CardContent>
         </Card>
       </TabsContent>

        {/* Tab Histórico */}
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Denúncias</CardTitle>
              {!startDate && !endDate && (userRole === 'admin' || userRole === 'super_admin') && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                  <p className="text-sm text-blue-700">
                    📅 Por padrão, são exibidas apenas as denúncias de hoje. 
                    Para ver denúncias de outros dias, use os filtros de data acima.
                  </p>
                </div>
              )}
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
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Ações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                    {visibleHistoryComplaints
                     .map((complaint) => {
                       const duplicateInfo = getDuplicateInfo(complaint, complaints);
                      
                      return (
                     <TableRow 
                       key={complaint.id}
                       className={cn(
                         duplicateInfo.isDuplicate && "bg-red-50 border-red-200"
                         // Remover a animação de piscar no histórico
                       )}
                     >
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {complaint.complainant_name}
                             {duplicateInfo.isDuplicate && (
                               <Badge 
                                 variant="destructive" 
                                 className="text-xs"
                                 // Remover animação de piscar no histórico
                               >
                                 {duplicateInfo.sequence}ª solicitação
                               </Badge>
                             )}
                          </div>
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
                            <div className="text-sm text-gray-500">
                              {new Date(complaint.processed_at).toLocaleTimeString('pt-BR')}
                              {complaint.status === 'fiscal_solicitado' && (
                                <div className="text-xs text-orange-600">Fiscal solicitado</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                         <TableCell>
                          {(() => {
                            console.log('Complaint data for attendant column:', {
                              id: complaint.id,
                              status: complaint.status,
                              attendant: (complaint as any).attendant,
                              archived_by_user: (complaint as any).archived_by_user,
                              processed_at: complaint.processed_at
                            });

                            if (complaint.status === 'finalizada') {
                              // Para denúncias finalizadas, mostrar quem arquivou
                              return (complaint as any).archived_by_user?.full_name ? (
                                <span className="text-sm">{(complaint as any).archived_by_user.full_name}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              );
                            } else if (complaint.status === 'fiscal_solicitado') {
                              // Para denúncias marcadas como fiscal solicitado, mostrar quem marcou
                              return (complaint as any).attendant?.full_name ? (
                                <div>
                                  <span className="text-sm">{(complaint as any).attendant.full_name}</span>
                                  <div className="text-xs text-gray-500">Marcou fiscal solicitado</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              );
                            } else {
                              // Para outras denúncias, mostrar quem cadastrou
                              return (complaint as any).attendant?.full_name ? (
                                <span className="text-sm">{(complaint as any).attendant.full_name}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              );
                            }
                           })()}
                         </TableCell>
                         <TableCell>
                           <div>
                             {(complaint.user_device_type || complaint.user_browser) ? (
                               <>
                                 {complaint.user_device_type && (
                                   <div className="text-sm font-medium">
                                     {complaint.user_device_type.charAt(0).toUpperCase() + complaint.user_device_type.slice(1)}
                                   </div>
                                 )}
                                 {complaint.user_browser && (
                                   <div className="text-xs text-gray-500">{complaint.user_browser}</div>
                                 )}
                               </>
                             ) : (
                               <span className="text-gray-400">Não informado</span>
                             )}
                           </div>
                         </TableCell>
                      <TableCell>
                       <Dialog>
                         <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                console.log('🔍 DEBUG onClick Ver (Histórico) - Complaint selecionada:', complaint);
                                console.log('🔍 DEBUG onClick Ver (Histórico) - user_location:', complaint.user_location);
                                console.log('🔍 DEBUG onClick Ver (Histórico) - photos:', complaint.photos);
                                console.log('🔍 DEBUG onClick Ver (Histórico) - videos:', complaint.videos);
                                setSelectedComplaint(complaint);
                              }}
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
                                 <h3 className="text-lg font-semibold">Nome da Rua da Ocorrência</h3>
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
                    );
                  })}
                 </TableBody>
              </Table>
              
              {/* Botão Carregar Mais para aba Histórico */}
              {hasMoreHistory && (
                <div className="flex justify-center py-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMoreHistory}
                    className="text-sm"
                  >
                    Carregar mais denúncias ({complaintsForHistoryTab.length - visibleHistoryComplaints.length} restantes)
                  </Button>
                </div>
              )}
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

      {/* Modal de resposta da API */}
      <Dialog open={apiResponseModal.isOpen} onOpenChange={(open) => setApiResponseModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {apiResponseModal.isSuccess ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  Denúncia Enviada com Sucesso
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Erro no Envio da Denúncia
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {apiResponseModal.isSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  ✅ A denúncia foi enviada com sucesso para o sistema Posturas!
                </p>
                {apiResponseModal.response?.id_reclamacao && (
                  <p className="text-green-700 mt-2">
                    <strong>ID da Reclamação:</strong> {apiResponseModal.response.id_reclamacao}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  ❌ Ocorreu um erro ao enviar a denúncia para o sistema.
                </p>
                {apiResponseModal.response?.message && (
                  <p className="text-red-700 mt-2">
                    <strong>Mensagem:</strong> {apiResponseModal.response.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3">Resposta Completa da API</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-96 border">
                {JSON.stringify(apiResponseModal.response, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={() => setApiResponseModal(prev => ({ ...prev, isOpen: false }))}
                variant="default"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};