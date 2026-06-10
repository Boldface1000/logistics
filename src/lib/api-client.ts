/**
 * Unified TanStack Query API client for EasyBlue.
 *
 * This module provides:
 *   1. A central `queryKeys` factory — every cache key in the app derives
 *      from here so invalidation is precise and refactor-safe.
 *   2. Typed `queryOptions(...)` builders for every production table the
 *      dashboards consume. Use them in route loaders
 *      (`context.queryClient.ensureQueryData(...)`) and in components
 *      (`useSuspenseQuery(...) / useQuery(...)`).
 *   3. Thin `mutations` helpers that wrap Supabase writes with consistent
 *      error handling. Pair with `useMutation({ mutationFn, onSuccess })`
 *      and invalidate the relevant `queryKeys.*` entries.
 *
 * Design notes:
 *   - All reads go through the browser `supabase` client and therefore
 *     respect RLS as the signed-in user. Privileged work belongs in
 *     `*.functions.ts` server functions (see `src/lib/otp.functions.ts`).
 *   - Every helper unwraps Supabase's `{ data, error }` envelope and
 *     throws on `error` so TanStack Query handles failure uniformly.
 *   - Keys are tuples of literal strings + scopes; the `as const` keeps
 *     them assignable to `QueryKey` while remaining narrow for inference.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Order,
  OrderInsert,
  OrderUpdate,
  Payment,
  Profile,
  ProfileUpdate,
  Rider,
  RiderUpdate,
  Vendor,
  VendorStock,
  VendorStockInsert,
  VendorStockUpdate,
} from "@/types/database.types";

// ---------------------------------------------------------------------------
// Query key registry
// ---------------------------------------------------------------------------
/**
 * Hierarchical query-key factory. Always read keys from here; never inline
 * string arrays in components. Invalidate with the broadest key that covers
 * the affected data, e.g. `queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })`.
 */
export const queryKeys = {
  profiles: {
    all: ["profiles"] as const,
    detail: (userId: string) => ["profiles", "detail", userId] as const,
    me: () => ["profiles", "me"] as const,
  },
  vendors: {
    all: ["vendors"] as const,
    list: (filters?: { approval?: string }) =>
      ["vendors", "list", filters ?? {}] as const,
    detail: (vendorId: string) => ["vendors", "detail", vendorId] as const,
    mine: () => ["vendors", "mine"] as const,
  },
  riders: {
    all: ["riders"] as const,
    list: (filters?: { approval?: string; available?: boolean }) =>
      ["riders", "list", filters ?? {}] as const,
    detail: (riderId: string) => ["riders", "detail", riderId] as const,
    mine: () => ["riders", "mine"] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (filters?: {
      status?: string;
      customerId?: string;
      riderId?: string;
    }) => ["orders", "list", filters ?? {}] as const,
    detail: (orderId: string) => ["orders", "detail", orderId] as const,
    items: (orderId: string) => ["orders", "items", orderId] as const,
    mine: () => ["orders", "mine"] as const,
  },
  vendorStocks: {
    all: ["vendor_stocks"] as const,
    list: (vendorId?: string) =>
      ["vendor_stocks", "list", vendorId ?? "all"] as const,
    detail: (stockId: string) =>
      ["vendor_stocks", "detail", stockId] as const,
  },
  payments: {
    all: ["payments"] as const,
    forOrder: (orderId: string) => ["payments", "order", orderId] as const,
    list: (filters?: { status?: string }) =>
      ["payments", "list", filters ?? {}] as const,
  },
  shipments: {
    all: ["shipments"] as const,
    forOrder: (orderId: string) => ["shipments", "order", orderId] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/** Unwrap a Supabase `{ data, error }` envelope or throw. */
function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "Supabase request failed";
    throw new Error(message);
  }
  if (data === null) {
    throw new Error("Resource not found");
  }
  return data;
}

/** Tunables — adjust per resource if the read pattern needs it. */
const STALE = {
  short: 15_000, // hot, realtime-backed data
  medium: 60_000, // dashboards refreshed every minute
  long: 5 * 60_000, // mostly-static lookups
};

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: queryKeys.profiles.me(),
      staleTime: STALE.medium,
      queryFn: async (): Promise<Profile> => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Not authenticated");
        return unwrap(
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", auth.user.id)
            .single(),
        );
      },
    }),
  byId: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.profiles.detail(userId),
      staleTime: STALE.long,
      queryFn: async (): Promise<Profile> =>
        unwrap(
          await supabase.from("profiles").select("*").eq("id", userId).single(),
        ),
    }),
};

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------
export const vendorQueries = {
  list: (filters?: { approval?: string }) =>
    queryOptions({
      queryKey: queryKeys.vendors.list(filters),
      staleTime: STALE.medium,
      queryFn: async (): Promise<Vendor[]> => {
        let q = supabase.from("vendors").select("*").order("created_at", {
          ascending: false,
        });
        if (filters?.approval) q = q.eq("approval", filters.approval as Vendor["approval"]);
        return unwrap(await q);
      },
    }),
  byId: (vendorId: string) =>
    queryOptions({
      queryKey: queryKeys.vendors.detail(vendorId),
      staleTime: STALE.medium,
      queryFn: async (): Promise<Vendor> =>
        unwrap(
          await supabase
            .from("vendors")
            .select("*")
            .eq("id", vendorId)
            .single(),
        ),
    }),
  mine: () =>
    queryOptions({
      queryKey: queryKeys.vendors.mine(),
      staleTime: STALE.medium,
      queryFn: async (): Promise<Vendor | null> => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return null;
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      },
    }),
};

// ---------------------------------------------------------------------------
// Riders
// ---------------------------------------------------------------------------
export const riderQueries = {
  list: (filters?: { approval?: string; available?: boolean }) =>
    queryOptions({
      queryKey: queryKeys.riders.list(filters),
      staleTime: STALE.short,
      queryFn: async (): Promise<Rider[]> => {
        let q = supabase.from("riders").select("*").order("created_at", {
          ascending: false,
        });
        if (filters?.approval) q = q.eq("approval", filters.approval as Rider["approval"]);
        if (typeof filters?.available === "boolean")
          q = q.eq("is_available", filters.available);
        return unwrap(await q);
      },
    }),
  byId: (riderId: string) =>
    queryOptions({
      queryKey: queryKeys.riders.detail(riderId),
      staleTime: STALE.short,
      queryFn: async (): Promise<Rider> =>
        unwrap(
          await supabase.from("riders").select("*").eq("id", riderId).single(),
        ),
    }),
  mine: () =>
    queryOptions({
      queryKey: queryKeys.riders.mine(),
      staleTime: STALE.short,
      queryFn: async (): Promise<Rider | null> => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return null;
        const { data, error } = await supabase
          .from("riders")
          .select("*")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      },
    }),
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const orderQueries = {
  list: (filters?: {
    status?: string;
    customerId?: string;
    riderId?: string;
  }) =>
    queryOptions({
      queryKey: queryKeys.orders.list(filters),
      staleTime: STALE.short,
      queryFn: async (): Promise<Order[]> => {
        let q = supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (filters?.status) q = q.eq("status", filters.status as Order["status"]);
        if (filters?.customerId) q = q.eq("customer_id", filters.customerId);
        if (filters?.riderId) q = q.eq("assigned_rider_id", filters.riderId);
        return unwrap(await q);
      },
    }),
  byId: (orderId: string) =>
    queryOptions({
      queryKey: queryKeys.orders.detail(orderId),
      staleTime: STALE.short,
      queryFn: async (): Promise<Order> =>
        unwrap(
          await supabase.from("orders").select("*").eq("id", orderId).single(),
        ),
    }),
  mine: () =>
    queryOptions({
      queryKey: queryKeys.orders.mine(),
      staleTime: STALE.short,
      queryFn: async (): Promise<Order[]> => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return [];
        return unwrap(
          await supabase
            .from("orders")
            .select("*")
            .eq("customer_id", auth.user.id)
            .order("created_at", { ascending: false }),
        );
      },
    }),
};

// ---------------------------------------------------------------------------
// Vendor stocks
// ---------------------------------------------------------------------------
export const vendorStockQueries = {
  list: (vendorId?: string) =>
    queryOptions({
      queryKey: queryKeys.vendorStocks.list(vendorId),
      staleTime: STALE.medium,
      queryFn: async (): Promise<VendorStock[]> => {
        let q = supabase
          .from("vendor_stocks")
          .select("*")
          .order("updated_at", { ascending: false });
        if (vendorId) q = q.eq("vendor_id", vendorId);
        return unwrap(await q);
      },
    }),
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export const paymentQueries = {
  forOrder: (orderId: string) =>
    queryOptions({
      queryKey: queryKeys.payments.forOrder(orderId),
      staleTime: STALE.short,
      queryFn: async (): Promise<Payment[]> =>
        unwrap(
          await supabase
            .from("payments")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false }),
        ),
    }),
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
/**
 * Centralised write helpers. Pair with `useMutation`:
 *
 *   const mut = useMutation({
 *     mutationFn: mutations.orders.create,
 *     onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
 *   });
 */
export const mutations = {
  profiles: {
    update: async (input: { id: string; patch: ProfileUpdate }): Promise<Profile> =>
      unwrap(
        await supabase
          .from("profiles")
          .update(input.patch)
          .eq("id", input.id)
          .select("*")
          .single(),
      ),
  },
  orders: {
    create: async (input: OrderInsert): Promise<Order> =>
      unwrap(
        await supabase.from("orders").insert(input).select("*").single(),
      ),
    update: async (input: { id: string; patch: OrderUpdate }): Promise<Order> =>
      unwrap(
        await supabase
          .from("orders")
          .update(input.patch)
          .eq("id", input.id)
          .select("*")
          .single(),
      ),
  },
  riders: {
    update: async (input: { id: string; patch: RiderUpdate }): Promise<Rider> =>
      unwrap(
        await supabase
          .from("riders")
          .update(input.patch)
          .eq("id", input.id)
          .select("*")
          .single(),
      ),
    setLocation: async (input: {
      id: string;
      lat: number;
      lng: number;
    }): Promise<Rider> =>
      unwrap(
        await supabase
          .from("riders")
          .update({
            current_lat: input.lat,
            current_lng: input.lng,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", input.id)
          .select("*")
          .single(),
      ),
  },
  vendorStocks: {
    create: async (input: VendorStockInsert): Promise<VendorStock> =>
      unwrap(
        await supabase.from("vendor_stocks").insert(input).select("*").single(),
      ),
    update: async (input: {
      id: string;
      patch: VendorStockUpdate;
    }): Promise<VendorStock> =>
      unwrap(
        await supabase
          .from("vendor_stocks")
          .update(input.patch)
          .eq("id", input.id)
          .select("*")
          .single(),
      ),
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from("vendor_stocks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },
} as const;
