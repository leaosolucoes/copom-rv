export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      complaints: {
        Row: {
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
          occurrence_date: string
          occurrence_lot: string | null
          occurrence_neighborhood: string
          occurrence_number: string | null
          occurrence_reference: string | null
          occurrence_time: string
          occurrence_type: string
          processed_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          system_identifier: string | null
          updated_at: string
          whatsapp_sent: boolean | null
        }
        Insert: {
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
          occurrence_date: string
          occurrence_lot?: string | null
          occurrence_neighborhood: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_time: string
          occurrence_type: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          system_identifier?: string | null
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Update: {
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
          occurrence_date?: string
          occurrence_lot?: string | null
          occurrence_neighborhood?: string
          occurrence_number?: string | null
          occurrence_reference?: string | null
          occurrence_time?: string
          occurrence_type?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          system_identifier?: string | null
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_user: {
        Args: { p_email: string; p_password: string }
        Returns: {
          user_id: string
          email: string
          full_name: string
          role: string
          is_active: boolean
          password_valid: boolean
        }[]
      }
      create_user_secure: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role?: string
          p_is_active?: boolean
          p_requester_id?: string
        }
        Returns: Json
      }
      get_users_secure: {
        Args: { p_requester_id?: string }
        Returns: Json
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      is_admin_or_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_user_secure: {
        Args: {
          p_user_id: string
          p_email: string
          p_full_name: string
          p_password?: string
          p_role?: string
          p_is_active?: boolean
          p_requester_id?: string
        }
        Returns: Json
      }
      verify_password: {
        Args: { password: string; hash: string }
        Returns: boolean
      }
    }
    Enums: {
      complaint_status: "nova" | "cadastrada" | "finalizada"
      user_role: "super_admin" | "admin" | "atendente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      complaint_status: ["nova", "cadastrada", "finalizada"],
      user_role: ["super_admin", "admin", "atendente"],
    },
  },
} as const
