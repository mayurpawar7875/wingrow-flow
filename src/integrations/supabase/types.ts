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
      asset_inspections: {
        Row: {
          admin_comment: string | null
          available_quantity: number
          condition: Database["public"]["Enums"]["inspection_condition"]
          created_at: string
          employee_id: string
          expected_quantity: number
          fine_amount: number | null
          gps_latitude: number
          gps_longitude: number
          id: string
          inspection_date: string
          is_late: boolean
          item_id: string
          late_remarks: string | null
          notes: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["inspection_status"]
          submission_date: string
          updated_at: string
        }
        Insert: {
          admin_comment?: string | null
          available_quantity: number
          condition: Database["public"]["Enums"]["inspection_condition"]
          created_at?: string
          employee_id: string
          expected_quantity: number
          fine_amount?: number | null
          gps_latitude: number
          gps_longitude: number
          id?: string
          inspection_date?: string
          is_late?: boolean
          item_id: string
          late_remarks?: string | null
          notes?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["inspection_status"]
          submission_date?: string
          updated_at?: string
        }
        Update: {
          admin_comment?: string | null
          available_quantity?: number
          condition?: Database["public"]["Enums"]["inspection_condition"]
          created_at?: string
          employee_id?: string
          expected_quantity?: number
          fine_amount?: number | null
          gps_latitude?: number
          gps_longitude?: number
          id?: string
          inspection_date?: string
          is_late?: boolean
          item_id?: string
          late_remarks?: string | null
          notes?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          submission_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_inspections_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      collections: {
        Row: {
          amount: number
          id: string
          item_request_id: string
          receipt_url: string | null
          recorded_at: string
          recorded_by: string
          remarks: string | null
        }
        Insert: {
          amount: number
          id?: string
          item_request_id: string
          receipt_url?: string | null
          recorded_at?: string
          recorded_by: string
          remarks?: string | null
        }
        Update: {
          amount?: number
          id?: string
          item_request_id?: string
          receipt_url?: string | null
          recorded_at?: string
          recorded_by?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_item_request_id_fkey"
            columns: ["item_request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_assets: {
        Row: {
          available_quantity: number
          condition: Database["public"]["Enums"]["inspection_condition"]
          created_at: string
          expected_quantity: number
          id: string
          item_id: string
          notes: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          available_quantity: number
          condition: Database["public"]["Enums"]["inspection_condition"]
          created_at?: string
          expected_quantity: number
          id?: string
          item_id: string
          notes?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          condition?: Database["public"]["Enums"]["inspection_condition"]
          created_at?: string
          expected_quantity?: number
          id?: string
          item_id?: string
          notes?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_assets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_assets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inspection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_sessions: {
        Row: {
          admin_comment: string | null
          created_at: string
          employee_id: string
          fine_amount: number | null
          gps_latitude: number
          gps_longitude: number
          id: string
          inspection_date: string
          is_late: boolean
          late_remarks: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["inspection_status"]
          submission_date: string
          updated_at: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          employee_id: string
          fine_amount?: number | null
          gps_latitude: number
          gps_longitude: number
          id?: string
          inspection_date?: string
          is_late?: boolean
          late_remarks?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["inspection_status"]
          submission_date?: string
          updated_at?: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          employee_id?: string
          fine_amount?: number | null
          gps_latitude?: number
          gps_longitude?: number
          id?: string
          inspection_date?: string
          is_late?: boolean
          late_remarks?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          submission_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          is_settled: boolean
          manager_comment: string | null
          market_or_location: string | null
          needed_by: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          proof_of_payment_remarks: string | null
          proof_of_payment_url: string | null
          proof_uploaded_at: string | null
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
          is_settled?: boolean
          manager_comment?: string | null
          market_or_location?: string | null
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          proof_of_payment_remarks?: string | null
          proof_of_payment_url?: string | null
          proof_uploaded_at?: string | null
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
          is_settled?: boolean
          manager_comment?: string | null
          market_or_location?: string | null
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          proof_of_payment_remarks?: string | null
          proof_of_payment_url?: string | null
          proof_uploaded_at?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      new_item_requests: {
        Row: {
          added_to_inventory: boolean
          admin_comment: string | null
          approved_at: string | null
          approved_quantity: number | null
          approved_unit_price: number | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          employee_id: string
          estimated_price_per_unit: number | null
          id: string
          inventory_item_id: string | null
          item_name: string
          market_or_location: string
          needed_by: string
          quantity: number
          reason: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          unit: string
          updated_at: string
          vendor_suggestion: string | null
        }
        Insert: {
          added_to_inventory?: boolean
          admin_comment?: string | null
          approved_at?: string | null
          approved_quantity?: number | null
          approved_unit_price?: number | null
          attachment_url?: string | null
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          employee_id: string
          estimated_price_per_unit?: number | null
          id?: string
          inventory_item_id?: string | null
          item_name: string
          market_or_location: string
          needed_by: string
          quantity: number
          reason: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          unit: string
          updated_at?: string
          vendor_suggestion?: string | null
        }
        Update: {
          added_to_inventory?: boolean
          admin_comment?: string | null
          approved_at?: string | null
          approved_quantity?: number | null
          approved_unit_price?: number | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          employee_id?: string
          estimated_price_per_unit?: number | null
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          market_or_location?: string
          needed_by?: string
          quantity?: number
          reason?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          unit?: string
          updated_at?: string
          vendor_suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_item_requests_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          designation: string | null
          email: string
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
          email: string
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
          email?: string
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
          market_or_location: string | null
          notes: string | null
          payment_reference: string | null
          reviewed_by: string | null
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
          market_or_location?: string | null
          notes?: string | null
          payment_reference?: string | null
          reviewed_by?: string | null
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
          market_or_location?: string | null
          notes?: string | null
          payment_reference?: string | null
          reviewed_by?: string | null
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
      inspection_condition: "New" | "Old"
      inspection_status: "Pending" | "Approved" | "Rejected"
      item_category: "Packaging" | "Stationery" | "Equipment" | "Other"
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
      inspection_condition: ["New", "Old"],
      inspection_status: ["Pending", "Approved", "Rejected"],
      item_category: ["Packaging", "Stationery", "Equipment", "Other"],
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
