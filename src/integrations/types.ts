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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bank_transfer_proofs: {
        Row: {
          amount_cents: number
          bank_name: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          order_id: string
          proof_path: string
          reference_text: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_name: string | null
          status: Database["public"]["Enums"]["proof_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          bank_name?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          order_id: string
          proof_path: string
          reference_text?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_name?: string | null
          status?: Database["public"]["Enums"]["proof_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          bank_name?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          order_id?: string
          proof_path?: string
          reference_text?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_name?: string | null
          status?: Database["public"]["Enums"]["proof_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfer_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price_cents: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_rider_id: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_code_hash: string | null
          dropoff_address: string | null
          id: string
          item_description: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          total_cents: number
          updated_at: string
        }
        Insert: {
          assigned_rider_id?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_code_hash?: string | null
          dropoff_address?: string | null
          id?: string
          item_description?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          total_cents?: number
          updated_at?: string
        }
        Update: {
          assigned_rider_id?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_code_hash?: string | null
          dropoff_address?: string | null
          id?: string
          item_description?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_rider_id_fkey"
            columns: ["assigned_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string
          provider_ref: string | null
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider: string
          provider_ref?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string
          provider_ref?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          partner_price_cents: number | null
          price_cents: number
          stock: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          partner_price_cents?: number | null
          price_cents: number
          stock?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          partner_price_cents?: number | null
          price_cents?: number
          stock?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval: Database["public"]["Enums"]["approval_status"]
          created_at: string
          disabled_at: string | null
          display_name: string | null
          email: string
          first_name: string
          id: string
          is_email_verified: boolean
          last_name: string
          phone: string | null
          profile_photo_url: string | null
          updated_at: string
        }
        Insert: {
          approval?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          disabled_at?: string | null
          display_name?: string | null
          email: string
          first_name?: string
          id: string
          is_email_verified?: boolean
          last_name?: string
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Update: {
          approval?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          disabled_at?: string | null
          display_name?: string | null
          email?: string
          first_name?: string
          id?: string
          is_email_verified?: boolean
          last_name?: string
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          hit_at: string
          id: number
        }
        Insert: {
          bucket: string
          hit_at?: string
          id?: number
        }
        Update: {
          bucket?: string
          hit_at?: string
          id?: number
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          issued_at: string
          order_id: string
          pdf_path: string
        }
        Insert: {
          id?: string
          issued_at?: string
          order_id: string
          pdf_path: string
        }
        Update: {
          id?: string
          issued_at?: string
          order_id?: string
          pdf_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          approval: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          has_license: boolean
          id: string
          is_available: boolean
          is_experienced: boolean
          last_seen_at: string | null
          nin: string | null
          nin_photo_url: string | null
          plate_number: string | null
          updated_at: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          approval?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          has_license?: boolean
          id?: string
          is_available?: boolean
          is_experienced?: boolean
          last_seen_at?: string | null
          nin?: string | null
          nin_photo_url?: string | null
          plate_number?: string | null
          updated_at?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          approval?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          has_license?: boolean
          id?: string
          is_available?: boolean
          is_experienced?: boolean
          last_seen_at?: string | null
          nin?: string | null
          nin_photo_url?: string | null
          plate_number?: string | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          dest_lat: number
          dest_lng: number
          id: string
          order_id: string
          origin_lat: number
          origin_lng: number
          rider_id: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
        }
        Insert: {
          dest_lat: number
          dest_lng: number
          id?: string
          order_id: string
          origin_lat: number
          origin_lng: number
          rider_id?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Update: {
          dest_lat?: number
          dest_lng?: number
          id?: string
          order_id?: string
          origin_lat?: number
          origin_lng?: number
          rider_id?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          conversation_user_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_is_admin: boolean
        }
        Insert: {
          body: string
          conversation_user_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_is_admin?: boolean
        }
        Update: {
          body?: string
          conversation_user_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_is_admin?: boolean
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          id: number
          lat: number
          lng: number
          recorded_at: string
          shipment_id: string
          speed_kph: number | null
        }
        Insert: {
          id?: number
          lat: number
          lng: number
          recorded_at?: string
          shipment_id: string
          speed_kph?: number | null
        }
        Update: {
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
          shipment_id?: string
          speed_kph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_stocks: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          product_type: string
          quantity: number
          received_at: string
          updated_at: string
          updated_by: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          product_type: string
          quantity: number
          received_at?: string
          updated_at?: string
          updated_by?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          product_type?: string
          quantity?: number
          received_at?: string
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_stocks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          approval: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          business_phone: string
          created_at: string
          id: string
          rating: number
          registered_business_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          business_phone: string
          created_at?: string
          id?: string
          rating?: number
          registered_business_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          business_phone?: string
          created_at?: string
          id?: string
          rating?: number
          registered_business_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "customer"
        | "vendor"
        | "rider"
        | "super_admin"
        | "logistics_admin"
      approval_status: "pending" | "approved" | "rejected"
      order_type: "marketplace" | "waybill" | "local_delivery"
      payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded"
      proof_status: "pending" | "approved" | "rejected"
      shipment_status:
        | "pending"
        | "assigned"
        | "accepted"
        | "declined"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
      app_role: [
        "customer",
        "vendor",
        "rider",
        "super_admin",
        "logistics_admin",
      ],
      approval_status: ["pending", "approved", "rejected"],
      order_type: ["marketplace", "waybill", "local_delivery"],
      payment_status: ["unpaid", "pending", "paid", "failed", "refunded"],
      proof_status: ["pending", "approved", "rejected"],
      shipment_status: [
        "pending",
        "assigned",
        "accepted",
        "declined",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
