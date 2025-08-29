export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_audit_logs: {
        Row: {
          browser_name: string | null
          created_at: string
          device_type: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          location_city: string | null
          location_country: string | null
          location_region: string | null
          login_method: string
          login_success: boolean
          login_timestamp: string
          logout_timestamp: string | null
          operating_system: string | null
          session_duration_minutes: number | null
          user_agent: string | null
          user_email: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          login_method?: string
          login_success?: boolean
          login_timestamp?: string
          logout_timestamp?: string | null
          operating_system?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_email: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          login_method?: string
          login_success?: boolean
          login_timestamp?: string
          logout_timestamp?: string | null
          operating_system?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      api_endpoints: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          method: string
          path: string
          rate_limit_per_hour: number
          required_scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          method: string
          path: string
          rate_limit_per_hour?: number
          required_scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          method?: string
          path?: string
          rate_limit_per_hour?: number
          required_scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          created_at: string
          endpoint: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          ip_address: unknown | null
          method: string
          request_body: Json | null
          response_body: Json | null
          status_code: number
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: unknown | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          status_code: number
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: unknown | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "api_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          requests_count: number
          token_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          requests_count?: number
          token_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          requests_count?: number
          token_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "api_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          rate_limit_per_hour: number
          scopes: string[]
          token_hash: string
          token_name: string
          token_type: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          rate_limit_per_hour?: number
          scopes?: string[]
          token_hash: string
          token_name: string
          token_type: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          rate_limit_per_hour?: number
          scopes?: string[]
          token_hash?: string
          token_name?: string
          token_type?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audiencias: {
        Row: {
          arquivo_oficio_url: string
          assinador_nome: string | null
          concluido_por: string | null
          created_at: string
          criado_por: string
          dados_assinatura: Json | null
          dados_validacao: Json | null
          data_assinatura: string | null
          data_audiencia: string
          data_conclusao_oficio: string | null
          eh_presencial: boolean | null
          hash_assinatura: string | null
          horario_audiencia: string
          id: string
          link_videoconferencia: string | null
          numero_processo: string
          oficio_concluido: boolean | null
          salt_assinatura: string | null
          status: string
          updated_at: string
          user_id: string
          vara: string
        }
        Insert: {
          arquivo_oficio_url: string
          assinador_nome?: string | null
          concluido_por?: string | null
          created_at?: string
          criado_por: string
          dados_assinatura?: Json | null
          dados_validacao?: Json | null
          data_assinatura?: string | null
          data_audiencia: string
          data_conclusao_oficio?: string | null
          eh_presencial?: boolean | null
          hash_assinatura?: string | null
          horario_audiencia: string
          id?: string
          link_videoconferencia?: string | null
          numero_processo: string
          oficio_concluido?: boolean | null
          salt_assinatura?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vara: string
        }
        Update: {
          arquivo_oficio_url?: string
          assinador_nome?: string | null
          concluido_por?: string | null
          created_at?: string
          criado_por?: string
          dados_assinatura?: Json | null
          dados_validacao?: Json | null
          data_assinatura?: string | null
          data_audiencia?: string
          data_conclusao_oficio?: string | null
          eh_presencial?: boolean | null
          hash_assinatura?: string | null
          horario_audiencia?: string
          id?: string
          link_videoconferencia?: string | null
          numero_processo?: string
          oficio_concluido?: boolean | null
          salt_assinatura?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vara?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiencias_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiencias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_config_items: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      checklist_equipamentos: {
        Row: {
          checklist_id: string
          created_at: string
          equipamento_nome: string
          id: string
          status: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          equipamento_nome: string
          id?: string
          status: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          equipamento_nome?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_equipamentos_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklist_viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_pneus: {
        Row: {
          checklist_id: string
          created_at: string
          dianteiro_direito: string
          dianteiro_esquerdo: string
          estepe: string
          id: string
          traseiro_direito: string
          traseiro_esquerdo: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          dianteiro_direito: string
          dianteiro_esquerdo: string
          estepe: string
          id?: string
          traseiro_direito: string
          traseiro_esquerdo: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          dianteiro_direito?: string
          dianteiro_esquerdo?: string
          estepe?: string
          id?: string
          traseiro_direito?: string
          traseiro_esquerdo?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_pneus_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklist_viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_viaturas: {
        Row: {
          combustivel_nivel: string
          created_at: string
          data_checklist: string
          data_proxima_troca_oleo: string | null
          fiscal_id: string
          horario_checklist: string
          id: string
          km_inicial: number
          km_proxima_troca_oleo: number | null
          limpeza_ok: boolean
          nome_guerra: string
          observacoes_alteracoes: string | null
          oleo_nivel: string
          status_aprovacao: string | null
          updated_at: string
          viatura_id: string
        }
        Insert: {
          combustivel_nivel: string
          created_at?: string
          data_checklist: string
          data_proxima_troca_oleo?: string | null
          fiscal_id: string
          horario_checklist: string
          id?: string
          km_inicial: number
          km_proxima_troca_oleo?: number | null
          limpeza_ok?: boolean
          nome_guerra: string
          observacoes_alteracoes?: string | null
          oleo_nivel: string
          status_aprovacao?: string | null
          updated_at?: string
          viatura_id: string
        }
        Update: {
          combustivel_nivel?: string
          created_at?: string
          data_checklist?: string
          data_proxima_troca_oleo?: string | null
          fiscal_id?: string
          horario_checklist?: string
          id?: string
          km_inicial?: number
          km_proxima_troca_oleo?: number | null
          limpeza_ok?: boolean
          nome_guerra?: string
          observacoes_alteracoes?: string | null
          oleo_nivel?: string
          status_aprovacao?: string | null
          updated_at?: string
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_viaturas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          archived_by: string | null
          assigned_to: string | null
          attendant_id: string | null
          classification: string
          complainant_address: string
          complainant_block: string | null
          complainant_lot: string | null
          complainant_name: string
          complainant_neighborhood: string
          complainant_number: string | null
          complainant_phone: string
          complainant_type: string
          created_at: string
          id: string
          narrative: string
          occurrence_address: string
          occurrence_block: string | null
          occurrence_date: string | null
          occurrence_lot: string | null
          occurrence_neighborhood: string
          occurrence_number: string | null
          occurrence_reference: string | null
          occurrence_time: string | null
          occurrence_type: string
          photos: string[] | null
          processed_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          system_identifier: string | null
          updated_at: string
          user_agent: string | null
          user_browser: string | null
          user_device_type: string | null
          user_ip: unknown | null
          user_location: Json | null
          verified_at: string | null
          videos: string[] | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          archived_by?: string | null
          assigned_to?: string | null
          attendant_id?: string | null
          classification: string
          complainant_address: string
          complainant_block?: string | null
          complainant_lot?: string | null
          complainant_name: string
          complainant_neighborhood: string
          complainant_number?: string | null
          complainant_phone: string
          complainant_type: string
          created_at?: string
          id?: string
          narrative: string
          occurrence_address: string
          occurrence_block?: string | null
          occurrence_date?: string | null
          occurrence_lot?: string | null
          occurrence_neighborhood: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_time?: string | null
          occurrence_type: string
          photos?: string[] | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          system_identifier?: string | null
          updated_at?: string
          user_agent?: string | null
          user_browser?: string | null
          user_device_type?: string | null
          user_ip?: unknown | null
          user_location?: Json | null
          verified_at?: string | null
          videos?: string[] | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          archived_by?: string | null
          assigned_to?: string | null
          attendant_id?: string | null
          classification?: string
          complainant_address?: string
          complainant_block?: string | null
          complainant_lot?: string | null
          complainant_name?: string
          complainant_neighborhood?: string
          complainant_number?: string | null
          complainant_phone?: string
          complainant_type?: string
          created_at?: string
          id?: string
          narrative?: string
          occurrence_address?: string
          occurrence_block?: string | null
          occurrence_date?: string | null
          occurrence_lot?: string | null
          occurrence_neighborhood?: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_time?: string | null
          occurrence_type?: string
          photos?: string[] | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          system_identifier?: string | null
          updated_at?: string
          user_agent?: string | null
          user_browser?: string | null
          user_device_type?: string | null
          user_ip?: unknown | null
          user_location?: Json | null
          verified_at?: string | null
          videos?: string[] | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_audiencias: {
        Row: {
          ativo: boolean
          configurado_por: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          configurado_por: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          configurado_por?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_audiencias_configurado_por_fkey"
            columns: ["configurado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_audit_logs: {
        Row: {
          consultation_type: Database["public"]["Enums"]["consultation_type"]
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          search_result: Json | null
          searched_data: string
          success: boolean
          user_agent: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          consultation_type: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          search_result?: Json | null
          searched_data: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          consultation_type?: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          search_result?: Json | null
          searched_data?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      escala_imprevistos: {
        Row: {
          created_at: string
          descricao_imprevisto: string
          escala_id: string
          fotos: string[] | null
          id: string
          motorista_id: string
        }
        Insert: {
          created_at?: string
          descricao_imprevisto: string
          escala_id: string
          fotos?: string[] | null
          id?: string
          motorista_id: string
        }
        Update: {
          created_at?: string
          descricao_imprevisto?: string
          escala_id?: string
          fotos?: string[] | null
          id?: string
          motorista_id?: string
        }
        Relationships: []
      }
      escalas_viaturas: {
        Row: {
          celular_funcional: string | null
          created_at: string
          data_servico: string
          encerrado_em: string | null
          encerrado_por: string | null
          fiscal_id: string | null
          hora_entrada: string
          hora_saida: string
          id: string
          km_final: number | null
          km_inicial: number
          motorista_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["escala_status"]
          updated_at: string
          viatura_id: string
        }
        Insert: {
          celular_funcional?: string | null
          created_at?: string
          data_servico: string
          encerrado_em?: string | null
          encerrado_por?: string | null
          fiscal_id?: string | null
          hora_entrada: string
          hora_saida: string
          id?: string
          km_final?: number | null
          km_inicial: number
          motorista_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["escala_status"]
          updated_at?: string
          viatura_id: string
        }
        Update: {
          celular_funcional?: string | null
          created_at?: string
          data_servico?: string
          encerrado_em?: string | null
          encerrado_por?: string | null
          fiscal_id?: string | null
          hora_entrada?: string
          hora_saida?: string
          id?: string
          km_final?: number | null
          km_inicial?: number
          motorista_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["escala_status"]
          updated_at?: string
          viatura_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          window_start: string | null
        }
        Insert: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          window_start?: string | null
        }
        Update: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          window_start?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      viaturas: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          km_atual: number
          modelo: string
          placa: string
          prefixo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          km_atual?: number
          modelo: string
          placa: string
          prefixo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          km_atual?: number
          modelo?: string
          placa?: string
          prefixo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_user: {
        Args: { p_email: string; p_password: string }
        Returns: {
          email: string
          full_name: string
          is_active: boolean
          password_valid: boolean
          role: string
          user_id: string
        }[]
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_limit: number; p_token_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { required_role: string; user_uuid: string }
        Returns: boolean
      }
      create_user_secure: {
        Args: {
          p_email: string
          p_full_name: string
          p_is_active?: boolean
          p_password: string
          p_requester_id?: string
          p_role?: string
        }
        Returns: Json
      }
      generate_api_token_hash: {
        Args: { token_string: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_secure: {
        Args: { p_requester_id?: string }
        Returns: Json
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      insert_api_log: {
        Args: {
          p_endpoint: string
          p_error_message?: string
          p_execution_time_ms: number
          p_ip_address: string
          p_method: string
          p_request_body?: Json
          p_response_body?: Json
          p_status_code: number
          p_token_id: string
          p_user_agent: string
        }
        Returns: string
      }
      is_admin_or_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin_custom: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin_or_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_atendente: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_fiscal: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_motorista: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_super_admin_custom: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_super_admin_safe: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin_by_id: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      log_rls_issue: {
        Args: {
          error_message: string
          operation: string
          table_name: string
          user_context?: Json
        }
        Returns: undefined
      }
      update_user_secure: {
        Args: {
          p_email: string
          p_full_name: string
          p_is_active?: boolean
          p_password?: string
          p_requester_id?: string
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_api_token: {
        Args: { token_string: string }
        Returns: {
          is_valid: boolean
          rate_limit_per_hour: number
          scopes: string[]
          token_id: string
          token_type: string
          user_id: string
        }[]
      }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "atendente" | "user" | "fiscal"
      complaint_status:
        | "nova"
        | "cadastrada"
        | "finalizada"
        | "a_verificar"
        | "verificado"
        | "fiscal_solicitado"
      consultation_type: "CPF" | "CNPJ" | "CEP"
      escala_status: "ativa" | "encerrada" | "cancelada"
      user_role: "super_admin" | "admin" | "atendente" | "fiscal" | "motorista"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "atendente", "user", "fiscal"],
      complaint_status: [
        "nova",
        "cadastrada",
        "finalizada",
        "a_verificar",
        "verificado",
        "fiscal_solicitado",
      ],
      consultation_type: ["CPF", "CNPJ", "CEP"],
      escala_status: ["ativa", "encerrada", "cancelada"],
      user_role: ["super_admin", "admin", "atendente", "fiscal", "motorista"],
    },
  },
} as const
