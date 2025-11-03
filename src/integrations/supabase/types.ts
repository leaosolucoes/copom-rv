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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_endpoints: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          method: string
          path: string
          rate_limit: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          method: string
          path: string
          rate_limit?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          method?: string
          path?: string
          rate_limit?: number | null
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
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
          created_at: string | null
          endpoint: string
          id: string
          requests_count: number | null
          token_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          requests_count?: number | null
          token_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          requests_count?: number | null
          token_id?: string | null
          window_start?: string | null
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
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          permissions: Json | null
          token: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          permissions?: Json | null
          token: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audiencias: {
        Row: {
          arquivo_oficio_url: string | null
          assinado_por: string | null
          created_at: string | null
          criado_por: string
          dados_validacao: Json | null
          data: string
          data_assinatura: string | null
          hash_assinatura: string | null
          horario: string
          id: string
          link_videoconferencia: string | null
          numero_processo: string
          oficio_concluido: boolean | null
          presencial: boolean | null
          salt_assinatura: string | null
          updated_at: string | null
          usuario_responsavel_id: string
          vara: string
        }
        Insert: {
          arquivo_oficio_url?: string | null
          assinado_por?: string | null
          created_at?: string | null
          criado_por: string
          dados_validacao?: Json | null
          data: string
          data_assinatura?: string | null
          hash_assinatura?: string | null
          horario: string
          id?: string
          link_videoconferencia?: string | null
          numero_processo: string
          oficio_concluido?: boolean | null
          presencial?: boolean | null
          salt_assinatura?: string | null
          updated_at?: string | null
          usuario_responsavel_id: string
          vara: string
        }
        Update: {
          arquivo_oficio_url?: string | null
          assinado_por?: string | null
          created_at?: string | null
          criado_por?: string
          dados_validacao?: Json | null
          data?: string
          data_assinatura?: string | null
          hash_assinatura?: string | null
          horario?: string
          id?: string
          link_videoconferencia?: string | null
          numero_processo?: string
          oficio_concluido?: boolean | null
          presencial?: boolean | null
          salt_assinatura?: string | null
          updated_at?: string | null
          usuario_responsavel_id?: string
          vara?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiencias_assinado_por_fkey"
            columns: ["assinado_por"]
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
            foreignKeyName: "audiencias_usuario_responsavel_id_fkey"
            columns: ["usuario_responsavel_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
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
      checklist_equipamentos: {
        Row: {
          checklist_id: string
          created_at: string | null
          equipamento: string
          foto_url: string | null
          id: string
          observacoes: string | null
          presente: boolean
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          equipamento: string
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          presente: boolean
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          equipamento?: string
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          presente?: boolean
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
          created_at: string | null
          estado: string
          foto_url: string | null
          id: string
          observacoes: string | null
          posicao: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          estado: string
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          posicao: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          estado?: string
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          posicao?: string
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
          created_at: string | null
          equipamentos_config: Json | null
          equipamentos_validados: Json | null
          fiscal_id: string
          id: string
          km_atual: number
          nivel_combustivel: string | null
          nivel_oleo: string | null
          observacoes: string | null
          viatura_id: string
        }
        Insert: {
          created_at?: string | null
          equipamentos_config?: Json | null
          equipamentos_validados?: Json | null
          fiscal_id: string
          id?: string
          km_atual: number
          nivel_combustivel?: string | null
          nivel_oleo?: string | null
          observacoes?: string | null
          viatura_id: string
        }
        Update: {
          created_at?: string | null
          equipamentos_config?: Json | null
          equipamentos_validados?: Json | null
          fiscal_id?: string
          id?: string
          km_atual?: number
          nivel_combustivel?: string | null
          nivel_oleo?: string | null
          observacoes?: string | null
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_viaturas_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          attendant_id: string | null
          classification: string | null
          complainant_address: string | null
          complainant_city: string | null
          complainant_complement: string | null
          complainant_name: string
          complainant_neighborhood: string | null
          complainant_number: string | null
          complainant_phone: string
          complainant_state: string | null
          complainant_type: string | null
          complainant_zip: string | null
          created_at: string | null
          deleted: boolean | null
          description: string
          id: string
          occurrence_address: string
          occurrence_city: string | null
          occurrence_complement: string | null
          occurrence_date: string | null
          occurrence_neighborhood: string
          occurrence_number: string | null
          occurrence_reference: string | null
          occurrence_state: string | null
          occurrence_type: string
          occurrence_zip: string | null
          protocol_number: string | null
          status: Database["public"]["Enums"]["complaint_status"] | null
          system_identifier: string | null
          updated_at: string | null
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          attendant_id?: string | null
          classification?: string | null
          complainant_address?: string | null
          complainant_city?: string | null
          complainant_complement?: string | null
          complainant_name: string
          complainant_neighborhood?: string | null
          complainant_number?: string | null
          complainant_phone: string
          complainant_state?: string | null
          complainant_type?: string | null
          complainant_zip?: string | null
          created_at?: string | null
          deleted?: boolean | null
          description: string
          id?: string
          occurrence_address: string
          occurrence_city?: string | null
          occurrence_complement?: string | null
          occurrence_date?: string | null
          occurrence_neighborhood: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_state?: string | null
          occurrence_type: string
          occurrence_zip?: string | null
          protocol_number?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          system_identifier?: string | null
          updated_at?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          attendant_id?: string | null
          classification?: string | null
          complainant_address?: string | null
          complainant_city?: string | null
          complainant_complement?: string | null
          complainant_name?: string
          complainant_neighborhood?: string | null
          complainant_number?: string | null
          complainant_phone?: string
          complainant_state?: string | null
          complainant_type?: string | null
          complainant_zip?: string | null
          created_at?: string | null
          deleted?: boolean | null
          description?: string
          id?: string
          occurrence_address?: string
          occurrence_city?: string | null
          occurrence_complement?: string | null
          occurrence_date?: string | null
          occurrence_neighborhood?: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_state?: string | null
          occurrence_type?: string
          occurrence_zip?: string | null
          protocol_number?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          system_identifier?: string | null
          updated_at?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
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
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      escala_imprevistos: {
        Row: {
          admin_ciente: boolean | null
          admin_ciente_em: string | null
          admin_ciente_por: string | null
          created_at: string | null
          data_hora: string | null
          descricao: string
          escala_id: string
          fotos: Json | null
          id: string
          local: string | null
          motorista_id: string
          tipo: string
        }
        Insert: {
          admin_ciente?: boolean | null
          admin_ciente_em?: string | null
          admin_ciente_por?: string | null
          created_at?: string | null
          data_hora?: string | null
          descricao: string
          escala_id: string
          fotos?: Json | null
          id?: string
          local?: string | null
          motorista_id: string
          tipo: string
        }
        Update: {
          admin_ciente?: boolean | null
          admin_ciente_em?: string | null
          admin_ciente_por?: string | null
          created_at?: string | null
          data_hora?: string | null
          descricao?: string
          escala_id?: string
          fotos?: Json | null
          id?: string
          local?: string | null
          motorista_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "escala_imprevistos_admin_ciente_por_fkey"
            columns: ["admin_ciente_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_imprevistos_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas_viaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_imprevistos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas_viaturas: {
        Row: {
          celular_funcional: string | null
          created_at: string | null
          data_servico: string
          encerrada_em: string | null
          encerrada_por: string | null
          fiscal_id: string | null
          hora_entrada: string
          hora_saida: string | null
          id: string
          km_final: number | null
          km_inicial: number
          motivo_encerramento: string | null
          motorista_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["escala_status"] | null
          updated_at: string | null
          viatura_id: string
        }
        Insert: {
          celular_funcional?: string | null
          created_at?: string | null
          data_servico: string
          encerrada_em?: string | null
          encerrada_por?: string | null
          fiscal_id?: string | null
          hora_entrada: string
          hora_saida?: string | null
          id?: string
          km_final?: number | null
          km_inicial: number
          motivo_encerramento?: string | null
          motorista_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["escala_status"] | null
          updated_at?: string | null
          viatura_id: string
        }
        Update: {
          celular_funcional?: string | null
          created_at?: string | null
          data_servico?: string
          encerrada_em?: string | null
          encerrada_por?: string | null
          fiscal_id?: string | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          km_final?: number | null
          km_inicial?: number
          motivo_encerramento?: string | null
          motorista_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["escala_status"] | null
          updated_at?: string | null
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_viaturas_encerrada_por_fkey"
            columns: ["encerrada_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_viaturas_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_viaturas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_viaturas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_km_viaturas: {
        Row: {
          created_at: string | null
          id: string
          km_registrado: number
          observacoes: string | null
          referencia_id: string | null
          tipo_registro: string | null
          usuario_id: string | null
          viatura_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          km_registrado: number
          observacoes?: string | null
          referencia_id?: string | null
          tipo_registro?: string | null
          usuario_id?: string | null
          viatura_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          km_registrado?: number
          observacoes?: string | null
          referencia_id?: string | null
          tipo_registro?: string | null
          usuario_id?: string | null
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_km_viaturas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_km_viaturas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
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
          active: boolean | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      viaturas: {
        Row: {
          ano: number | null
          ativa: boolean | null
          created_at: string | null
          data_ultima_troca_oleo: string | null
          id: string
          km_atual: number | null
          km_proxima_troca: number | null
          modelo: string
          observacoes: string | null
          placa: string
          prefixo: string
          ultima_troca_oleo: number | null
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          ativa?: boolean | null
          created_at?: string | null
          data_ultima_troca_oleo?: string | null
          id?: string
          km_atual?: number | null
          km_proxima_troca?: number | null
          modelo: string
          observacoes?: string | null
          placa: string
          prefixo: string
          ultima_troca_oleo?: number | null
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          ativa?: boolean | null
          created_at?: string | null
          data_ultima_troca_oleo?: string | null
          id?: string
          km_atual?: number | null
          km_proxima_troca?: number | null
          modelo?: string
          observacoes?: string | null
          placa?: string
          prefixo?: string
          ultima_troca_oleo?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { password: string }; Returns: string }
      is_current_user_admin_custom: { Args: never; Returns: boolean }
      is_current_user_fiscal: { Args: never; Returns: boolean }
      is_current_user_motorista: { Args: never; Returns: boolean }
      is_current_user_super_admin_custom: { Args: never; Returns: boolean }
      verify_password: {
        Args: { password: string; password_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "atendente" | "user"
      complaint_status: "nova" | "cadastrada" | "finalizada"
      escala_status: "ativa" | "encerrada" | "cancelada"
      user_role:
        | "super_admin"
        | "admin"
        | "atendente"
        | "fiscal"
        | "motorista"
        | "transporte"
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
      app_role: ["super_admin", "admin", "atendente", "user"],
      complaint_status: ["nova", "cadastrada", "finalizada"],
      escala_status: ["ativa", "encerrada", "cancelada"],
      user_role: [
        "super_admin",
        "admin",
        "atendente",
        "fiscal",
        "motorista",
        "transporte",
      ],
    },
  },
} as const
