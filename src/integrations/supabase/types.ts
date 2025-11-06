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
      access_audit_logs: {
        Row: {
          created_at: string | null
          failure_reason: string | null
          geolocation: Json | null
          id: string
          ip_address: string | null
          login_success: boolean
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          failure_reason?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          login_success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          failure_reason?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          login_success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_history: {
        Row: {
          alert_type: string
          created_at: string
          details: Json | null
          id: string
          message: string
          sent_email: boolean
          sent_whatsapp: boolean
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          sent_email?: boolean
          sent_whatsapp?: boolean
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          sent_email?: boolean
          sent_whatsapp?: boolean
          severity?: string
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          created_at: string
          email_enabled: boolean
          email_recipients: string[]
          enabled: boolean
          id: string
          thresholds: Json
          updated_at: string
          whatsapp_enabled: boolean
          whatsapp_recipients: string[]
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          email_recipients?: string[]
          enabled?: boolean
          id?: string
          thresholds?: Json
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_recipients?: string[]
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          email_recipients?: string[]
          enabled?: boolean
          id?: string
          thresholds?: Json
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_recipients?: string[]
        }
        Relationships: []
      }
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
      complaints: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          attendant_id: string | null
          classification: string | null
          complainant_address: string | null
          complainant_block: string | null
          complainant_city: string | null
          complainant_complement: string | null
          complainant_lot: string | null
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
          occurrence_block: string | null
          occurrence_city: string | null
          occurrence_complement: string | null
          occurrence_date: string | null
          occurrence_lot: string | null
          occurrence_neighborhood: string
          occurrence_number: string | null
          occurrence_reference: string | null
          occurrence_state: string | null
          occurrence_time: string | null
          occurrence_type: string
          occurrence_zip: string | null
          photos: Json | null
          processed_at: string | null
          protocol_number: string | null
          status: Database["public"]["Enums"]["complaint_status"] | null
          system_identifier: string | null
          updated_at: string | null
          user_agent: string | null
          user_browser: string | null
          user_device_type: string | null
          user_ip: string | null
          user_location: Json | null
          verified_at: string | null
          videos: Json | null
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
          complainant_block?: string | null
          complainant_city?: string | null
          complainant_complement?: string | null
          complainant_lot?: string | null
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
          occurrence_block?: string | null
          occurrence_city?: string | null
          occurrence_complement?: string | null
          occurrence_date?: string | null
          occurrence_lot?: string | null
          occurrence_neighborhood: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_state?: string | null
          occurrence_time?: string | null
          occurrence_type: string
          occurrence_zip?: string | null
          photos?: Json | null
          processed_at?: string | null
          protocol_number?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          system_identifier?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_browser?: string | null
          user_device_type?: string | null
          user_ip?: string | null
          user_location?: Json | null
          verified_at?: string | null
          videos?: Json | null
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
          complainant_block?: string | null
          complainant_city?: string | null
          complainant_complement?: string | null
          complainant_lot?: string | null
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
          occurrence_block?: string | null
          occurrence_city?: string | null
          occurrence_complement?: string | null
          occurrence_date?: string | null
          occurrence_lot?: string | null
          occurrence_neighborhood?: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_state?: string | null
          occurrence_time?: string | null
          occurrence_type?: string
          occurrence_zip?: string | null
          photos?: Json | null
          processed_at?: string | null
          protocol_number?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          system_identifier?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_browser?: string | null
          user_device_type?: string | null
          user_ip?: string | null
          user_location?: Json | null
          verified_at?: string | null
          videos?: Json | null
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
      consultation_audit_logs: {
        Row: {
          consultation_type: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          search_result: Json | null
          searched_data: string
          success: boolean
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          consultation_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          search_result?: Json | null
          searched_data: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          consultation_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          search_result?: Json | null
          searched_data?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      create_user_secure:
        | {
            Args: {
              p_email: string
              p_full_name: string
              p_password: string
              p_role?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_email: string
              p_full_name: string
              p_is_active?: boolean
              p_password: string
              p_role?: string
            }
            Returns: Json
          }
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
      update_user_secure: {
        Args: {
          p_email?: string
          p_full_name?: string
          p_is_active?: boolean
          p_password?: string
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_api_token: {
        Args: { token_string: string }
        Returns: {
          is_valid: boolean
          rate_limit: number
          scopes: Json
          token_id: string
          user_id: string
        }[]
      }
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
