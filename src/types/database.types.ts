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
      admin_profiles: {
        Row: {
          scope: Database["public"]["Enums"]["admin_scope"]
          user_id: string
        }
        Insert: {
          scope: Database["public"]["Enums"]["admin_scope"]
          user_id: string
        }
        Update: {
          scope?: Database["public"]["Enums"]["admin_scope"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      item_drops: {
        Row: {
          assigned_rider: string | null
          completed_at: string | null
          created_at: string
          description: string
          dropper_name: string
          id: string
          reference_code: string
          status: Database["public"]["Enums"]["drop_status"]
        }
        Insert: {
          assigned_rider?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          dropper_name: string
          id?: string
          reference_code: string
          status?: Database["public"]["Enums"]["drop_status"]
        }
        Update: {
          assigned_rider?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          dropper_name?: string
          id?: string
          reference_code?: string
          status?: Database["public"]["Enums"]["drop_status"]
        }
        Relationships: [
          {
            foreignKeyName: "item_drops_assigned_rider_fkey"
            columns: ["assigned_rider"]
            isOneToOne: false
            referencedRelation: "riders"
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
          amount_to_be_paid: string | null
          assigned_rider_id: string | null
          contact_number: string | null
          content_of_item: string | null
          created_at: string
          customer_id: string
          delivery_code: string | null
          driver_or_storekeeper_number: string | null
          drop_off_number: string | null
          drop_off_point: string | null
          dropoff: string | null
          id: string
          item_description: string
          name_on_parcel: string | null
          order_type: string | null
          park_name: string | null
          payment_method: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          phone_number_on_parcel: string | null
          pickup: string | null
          receiver_location: string | null
          receiver_name: string | null
          receiver_name_park: string | null
          receiver_phone: string | null
          recipient_name: string | null
          sender_location: string | null
          sender_name: string | null
          sender_phone: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          status_version: number
          total_cents: number | null
          updated_at: string
          waybill: string | null
        }
        Insert: {
          amount_to_be_paid?: string | null
          assigned_rider_id?: string | null
          contact_number?: string | null
          content_of_item?: string | null
          created_at?: string
          customer_id: string
          delivery_code?: string | null
          driver_or_storekeeper_number?: string | null
          drop_off_number?: string | null
          drop_off_point?: string | null
          dropoff?: string | null
          id?: string
          item_description: string
          name_on_parcel?: string | null
          order_type?: string | null
          park_name?: string | null
          payment_method?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          phone_number_on_parcel?: string | null
          pickup?: string | null
          receiver_location?: string | null
          receiver_name?: string | null
          receiver_name_park?: string | null
          receiver_phone?: string | null
          recipient_name?: string | null
          sender_location?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          status_version?: number
          total_cents?: number | null
          updated_at?: string
          waybill?: string | null
        }
        Update: {
          amount_to_be_paid?: string | null
          assigned_rider_id?: string | null
          contact_number?: string | null
          content_of_item?: string | null
          created_at?: string
          customer_id?: string
          delivery_code?: string | null
          driver_or_storekeeper_number?: string | null
          drop_off_number?: string | null
          drop_off_point?: string | null
          dropoff?: string | null
          id?: string
          item_description?: string
          name_on_parcel?: string | null
          order_type?: string | null
          park_name?: string | null
          payment_method?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          phone_number_on_parcel?: string | null
          pickup?: string | null
          receiver_location?: string | null
          receiver_name?: string | null
          receiver_name_park?: string | null
          receiver_phone?: string | null
          recipient_name?: string | null
          sender_location?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          status_version?: number
          total_cents?: number | null
          updated_at?: string
          waybill?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_rider_id_fkey"
            columns: ["assigned_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
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
      rate_limits: {
        Row: {
          bucket: string
          hit_at: string
        }
        Insert: {
          bucket: string
          hit_at?: string
        }
        Update: {
          bucket?: string
          hit_at?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          approval: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          deployment_status: Database["public"]["Enums"]["rider_deployment_status"]
          has_license: boolean
          id: string
          is_available: boolean
          is_experienced: boolean
          nin: string | null
          nin_photo_url: string | null
          plate_number: string | null
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
          deployment_status?: Database["public"]["Enums"]["rider_deployment_status"]
          has_license?: boolean
          id?: string
          is_available?: boolean
          is_experienced?: boolean
          nin?: string | null
          nin_photo_url?: string | null
          plate_number?: string | null
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
          deployment_status?: Database["public"]["Enums"]["rider_deployment_status"]
          has_license?: boolean
          id?: string
          is_available?: boolean
          is_experienced?: boolean
          nin?: string | null
          nin_photo_url?: string | null
          plate_number?: string | null
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_user_id_fkey"
            columns: ["conversation_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_conversation_user_id_fkey"
            columns: ["conversation_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_events: {
        Row: {
          id: number
          lat: number
          lng: number
          recorded_at: string
          rider_id: string | null
          shipment_id: string
          speed_kph: number | null
        }
        Insert: {
          id?: number
          lat: number
          lng: number
          recorded_at?: string
          rider_id?: string | null
          shipment_id: string
          speed_kph?: number | null
        }
        Update: {
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
          rider_id?: string | null
          shipment_id?: string
          speed_kph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_events_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          agreed_terms: boolean
          approval: Database["public"]["Enums"]["approval_status"]
          created_at: string
          display_name: string | null
          email: string
          first_name: string
          full_name: string | null
          id: string
          is_verified: boolean
          last_name: string
          password_hash: string
          phone: string
          profile_photo_url: string | null
          remember_me: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          agreed_terms?: boolean
          approval?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          display_name?: string | null
          email: string
          first_name: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          last_name: string
          password_hash: string
          phone: string
          profile_photo_url?: string | null
          remember_me?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          agreed_terms?: boolean
          approval?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          display_name?: string | null
          email?: string
          first_name?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          last_name?: string
          password_hash?: string
          phone?: string
          profile_photo_url?: string | null
          remember_me?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      vendor_stocks: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          price_cents: number
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
          price_cents?: number
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
          price_cents?: number
          product_type?: string
          quantity?: number
          received_at?: string
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_stocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_stocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles: {
        Row: {
          approval: Database["public"]["Enums"]["approval_status"] | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          phone: string | null
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          approval?: Database["public"]["Enums"]["approval_status"] | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          approval?: Database["public"]["Enums"]["approval_status"] | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_record_rate_limit: {
        Args: { p_bucket: string; p_max_hits: number; p_window_seconds: number }
        Returns: boolean
      }
      check_phone_exists: { Args: { p_phone: string }; Returns: boolean }
      create_db_order: {
        Args: {
          p_amount_to_be_paid?: string
          p_contact_number?: string
          p_content_of_item?: string
          p_customer_id: string
          p_driver_or_storekeeper_number?: string
          p_drop_off_point?: string
          p_item_description?: string
          p_park_name?: string
          p_payment_mode?: string
          p_receiver_location?: string
          p_receiver_name?: string
          p_receiver_phone?: string
          p_sender_location?: string
          p_sender_name?: string
          p_sender_phone?: string
          p_total_cents?: number
        }
        Returns: string
      }
      create_marketplace_order: {
        Args: {
          p_customer_id: string
          p_payment_mode?: string
          p_product_type: string
          p_purchase_quantity: number
          p_receiver_location?: string
          p_receiver_name?: string
          p_receiver_phone?: string
          p_sender_location?: string
          p_sender_name?: string
          p_sender_phone?: string
          p_total_cents?: number
          p_vendor_id: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      admin_scope: "super" | "logistics"
      approval_status: "pending" | "approved" | "rejected"
      drop_status: "registered" | "assigned" | "completed"
      order_type: "marketplace" | "waybill" | "standard"
      payment_mode: "transfer" | "cash"
      rider_deployment_status: "offline" | "idle" | "active"
      rider_response: "pending" | "accepted" | "declined"
      shipment_status:
        | "pending"
        | "assigned"
        | "accepted"
        | "declined"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      user_role: "customer" | "vendor" | "rider" | "admin"
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
      admin_scope: ["super", "logistics"],
      approval_status: ["pending", "approved", "rejected"],
      drop_status: ["registered", "assigned", "completed"],
      order_type: ["marketplace", "waybill", "standard"],
      payment_mode: ["transfer", "cash"],
      rider_deployment_status: ["offline", "idle", "active"],
      rider_response: ["pending", "accepted", "declined"],
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
      user_role: ["customer", "vendor", "rider", "admin"],
    },
  },
} as const
