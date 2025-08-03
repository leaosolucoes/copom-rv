import { useMemo } from 'react';

type ComplaintStatus = 'nova' | 'cadastrada' | 'finalizada' | 'a_verificar' | 'verificado' | 'fiscal_solicitado';

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
  user_location?: any;
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

interface FilterOptions {
  searchTerm: string;
  deviceFilter: string;
  activeTab: string;
  startDate?: Date;
  endDate?: Date;
  userRole: string;
}

export const useComplaintsFilter = (complaints: Complaint[], options: FilterOptions) => {
  const { searchTerm, deviceFilter, activeTab, startDate, endDate, userRole } = options;

  // Memoize hoje para evitar recálculos desnecessários
  const today = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    };
  }, []);

  // Memoize date range quando há datas selecionadas
  const dateRange = useMemo(() => {
    if (startDate && endDate) {
      return {
        start: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
        end: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59)
      };
    } else if (startDate) {
      return {
        start: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
        end: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59)
      };
    } else if (endDate) {
      return {
        start: new Date(0),
        end: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59)
      };
    }
    return null;
  }, [startDate, endDate]);

  // Filtros aplicados com memoização
  const filteredComplaints = useMemo(() => {
    return complaints.filter(complaint => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        complaint.complainant_name.toLowerCase().includes(searchLower) ||
        complaint.occurrence_address.toLowerCase().includes(searchLower) ||
        complaint.classification.toLowerCase().includes(searchLower);
      
      // Device filter
      const matchesDevice = deviceFilter === 'todos' || 
        (deviceFilter === 'não informado' && !complaint.user_device_type) ||
        complaint.user_device_type?.toLowerCase() === deviceFilter.toLowerCase();

      // Date filter for history tab
      let matchesDateFilter = true;
      if (activeTab === 'historico') {
        const complaintDate = new Date(complaint.created_at);
        
        if (!startDate && !endDate) {
          // Default to today's complaints
          matchesDateFilter = complaintDate >= today.start && complaintDate <= today.end;
        } else if (dateRange) {
          // Use selected date range
          matchesDateFilter = complaintDate >= dateRange.start && complaintDate <= dateRange.end;
        }
      }
      
      return matchesSearch && matchesDevice && matchesDateFilter;
    });
  }, [complaints, searchTerm, deviceFilter, activeTab, today, dateRange]);

  // Complaints por aba com memoização
  const complaintsForNewTab = useMemo(() => {
    return filteredComplaints.filter(complaint => {
      if (userRole === 'admin' || userRole === 'super_admin') {
        return complaint.status === 'nova' || complaint.status === 'a_verificar' || complaint.status === 'verificado';
      }
      return complaint.status === 'nova' || complaint.status === 'verificado';
    });
  }, [filteredComplaints, userRole]);

  const complaintsForHistoryTab = useMemo(() => {
    return filteredComplaints.filter(complaint => {
      if (userRole === 'atendente') {
        return complaint.status === 'cadastrada' || complaint.status === 'fiscal_solicitado';
      }
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        return complaint.status === 'cadastrada' || 
               complaint.status === 'fiscal_solicitado' || 
               complaint.status === 'finalizada';
      }
      
      return false;
    });
  }, [filteredComplaints, userRole]);

  return {
    filteredComplaints,
    complaintsForNewTab,
    complaintsForHistoryTab
  };
};