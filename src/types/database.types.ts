/**
 * Domain type aliases derived from the generated Supabase schema.
 *
 * These are thin re-exports so that application code (loaders, mutations,
 * components) does not have to spell out
 * `Database["public"]["Tables"]["orders"]["Row"]` everywhere.
 *
 * Source of truth is `src/integrations/supabase/types.ts` — DO NOT edit the
 * shapes here; if the schema changes, the generated types regenerate and
 * these aliases pick up the change automatically.
 */
import type { Database } from "@/integrations/supabase/types";

// ---- Helper utility types --------------------------------------------------
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

// ---- Enums -----------------------------------------------------------------
export type AppRole = Enums<"app_role">;
export type ShipmentStatus = Enums<"shipment_status">;
export type OrderType = Enums<"order_type">;
export type PaymentStatus = Enums<"payment_status">;
export type ApprovalStatus = Enums<"approval_status">;
export type ProofStatus = Enums<"proof_status">;

// ---- Row aliases -----------------------------------------------------------
export type Profile = Tables<"profiles">;
export type UserRole = Tables<"user_roles">;
export type Vendor = Tables<"vendors">;
export type Rider = Tables<"riders">;
export type Product = Tables<"products">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type Shipment = Tables<"shipments">;
export type TelemetryEvent = Tables<"telemetry_events">;
export type VendorStock = Tables<"vendor_stocks">;
export type Payment = Tables<"payments">;
export type Receipt = Tables<"receipts">;
export type BankTransferProof = Tables<"bank_transfer_proofs">;
export type PushSubscription = Tables<"push_subscriptions">;

// ---- Insert aliases (writable shapes) --------------------------------------
export type ProfileInsert = TablesInsert<"profiles">;
export type VendorInsert = TablesInsert<"vendors">;
export type RiderInsert = TablesInsert<"riders">;
export type OrderInsert = TablesInsert<"orders">;
export type OrderItemInsert = TablesInsert<"order_items">;
export type ShipmentInsert = TablesInsert<"shipments">;
export type VendorStockInsert = TablesInsert<"vendor_stocks">;
export type PaymentInsert = TablesInsert<"payments">;
export type BankTransferProofInsert = TablesInsert<"bank_transfer_proofs">;
export type PushSubscriptionInsert = TablesInsert<"push_subscriptions">;

// ---- Update aliases --------------------------------------------------------
export type ProfileUpdate = TablesUpdate<"profiles">;
export type OrderUpdate = TablesUpdate<"orders">;
export type ShipmentUpdate = TablesUpdate<"shipments">;
export type VendorStockUpdate = TablesUpdate<"vendor_stocks">;
export type RiderUpdate = TablesUpdate<"riders">;

// ---- Composite / hydrated shapes -------------------------------------------
/** Order with its line items joined in — used by customer + admin dashboards. */
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

/** Order with shipment + rider context — used by tracking views. */
export interface OrderWithShipment extends Order {
  shipments: Shipment | null;
}

/** Hydrated rider record (rider row + profile basics). */
export interface RiderWithProfile extends Rider {
  profile: Pick<
    Profile,
    "first_name" | "last_name" | "display_name" | "phone" | "profile_photo_url"
  > | null;
}

/** Vendor with the profile for the owning user. */
export interface VendorWithProfile extends Vendor {
  profile: Pick<Profile, "first_name" | "last_name" | "email" | "phone"> | null;
}

/** Vendor-stock joined with the owning vendor's business name. */
export interface VendorStockWithVendor extends VendorStock {
  vendor: Pick<Vendor, "id" | "registered_business_name"> | null;
}

/** Payment joined with order summary for admin reconciliation. */
export interface PaymentWithOrder extends Payment {
  order: Pick<Order, "id" | "customer_id" | "total_cents" | "status"> | null;
}
