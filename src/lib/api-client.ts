import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";

export const orderQueries = {
  all: () => ["orders"] as const,
  mine: (userId?: string) =>
    queryOptions({
      queryKey: [...orderQueries.all(), "mine", userId],
      enabled: !!userId,
      queryFn: async () => {
        if (!userId) throw new Error("Unauthorized");
        const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
    },
  }),
  byRider: (userId ? : string) => ({
  queryKey: [...orderQueries.all(), "rider", userId],
  enabled: !!userId,
  queryFn: async () => {
    if (!userId) throw new Error("Unauthorized");
    // Resolve riders.id from the user UUID first
    const { data: riderRow, error: rErr } = await supabase
      .from("riders")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (rErr) throw rErr;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_rider_id", riderRow.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
}),
  everything: (enabled = false) => ({
    queryKey: [...orderQueries.all(), "everything"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*");
      if (error) throw error;
      return data ?? [];
    },
  }),
};

/**
 * Compatibility Export Layer
 * Maps to orderQueries to satisfy imports looking for queryKeys objects.
 */
export const queryKeys = {
  orders: orderQueries.all,
};
