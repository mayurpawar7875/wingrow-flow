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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          changes_json: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          changes_json?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          changes_json?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          item_version: number
          location: string | null
          max_level: number
          name: string
          notes: string | null
          price_per_item: number | null
          quantity_on_hand: number
          reorder_level: number
          sku: string
          tags: string[] | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          item_version?: number
          location?: string | null
          max_level?: number
          name: string
          notes?: string | null
          price_per_item?: number | null
          quantity_on_hand?: number
          reorder_level?: number
          sku: string
          tags?: string[] | null
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          item_version?: number
          location?: string | null
          max_level?: number
          name?: string
          notes?: string | null
          price_per_item?: number | null
          quantity_on_hand?: number
          reorder_level?: number
          sku?: string
          tags?: string[] | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          new_quantity: number | null
          performed_by: string
          prev_quantity: number | null
          quantity: number
          reason: string | null
          reference: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          new_quantity?: number | null
          performed_by: string
          prev_quantity?: number | null
          quantity: number
          reason?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          new_quantity?: number | null
          performed_by?: string
          prev_quantity?: number | null
          quantity?: number
          reason?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_requests: {
        Row: {
          attachment_url: string | null
          category: Database["public"]["Enums"]["request_category"]
          created_at: string
          description: string | null
          id: string
          manager_comment: string | null
          needed_by: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          quantity: number
          status: Database["public"]["Enums"]["request_status"]
          title: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          category: Database["public"]["Enums"]["request_category"]
          created_at?: string
          description?: string | null
          id?: string
          manager_comment?: string | null
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          quantity: number
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["request_category"]
          created_at?: string
          description?: string | null
          id?: string
          manager_comment?: string | null
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          quantity?: number
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          phone_number: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          location?: string | null
          name: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          amount: number
          bill_file_url: string | null
          category: Database["public"]["Enums"]["reimbursement_category"]
          created_at: string
          date: string
          id: string
          manager_comment: string | null
          notes: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["reimbursement_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bill_file_url?: string | null
          category: Database["public"]["Enums"]["reimbursement_category"]
          created_at?: string
          date: string
          id?: string
          manager_comment?: string | null
          notes?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["reimbursement_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_file_url?: string | null
          category?: Database["public"]["Enums"]["reimbursement_category"]
          created_at?: string
          date?: string
          id?: string
          manager_comment?: string | null
          notes?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["reimbursement_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          approval_rules_json: Json | null
          created_at: string
          currency: string
          id: string
          org_name: string
          reimbursement_limits_json: Json | null
          timezone: string
          updated_at: string
        }
        Insert: {
          approval_rules_json?: Json | null
          created_at?: string
          currency?: string
          id?: string
          org_name?: string
          reimbursement_limits_json?: Json | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          approval_rules_json?: Json | null
          created_at?: string
          currency?: string
          id?: string
          org_name?: string
          reimbursement_limits_json?: Json | null
          timezone?: string
          updated_at?: string
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
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_stock_with_version: {
        Args: {
          _current_version: number
          _item_id: string
          _movement_type: string
          _performed_by: string
          _quantity_delta: number
          _reason: string
          _reference_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "ADMIN" | "MANAGER" | "EMPLOYEE"
      priority_level: "Low" | "Medium" | "High"
      reimbursement_category: "Travel" | "Food" | "Stationery" | "Misc"
      reimbursement_status: "Submitted" | "Approved" | "Rejected" | "Paid"
      request_category: "Stationery" | "Packaging" | "Transport" | "Misc"
      request_status:
        | "Draft"
        | "Submitted"
        | "Approved"
        | "Rejected"
        | "Procured"
        | "Issued"
      transaction_type: "Inbound" | "Outbound" | "Adjustment"
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
      app_role: ["ADMIN", "MANAGER", "EMPLOYEE"],
      priority_level: ["Low", "Medium", "High"],
      reimbursement_category: ["Travel", "Food", "Stationery", "Misc"],
      reimbursement_status: ["Submitted", "Approved", "Rejected", "Paid"],
      request_category: ["Stationery", "Packaging", "Transport", "Misc"],
      request_status: [
        "Draft",
        "Submitted",
        "Approved",
        "Rejected",
        "Procured",
        "Issued",
      ],
      transaction_type: ["Inbound", "Outbound", "Adjustment"],
    },
  },
} as const
