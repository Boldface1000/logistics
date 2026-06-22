import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";

export const orderQueries = {
  all: () => ["orders"] as const,

  /**
   * Fetches orders created by the current authenticated customer profile
   */
  mine: (userId?: string) =>
    queryOptions({
      queryKey: [...orderQueries.all(), "mine", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase.from("orders").select("*").eq("customer_id", userId);

        if (error) throw error;
        return data || [];
      },
    }),

  /**
   * Fetches orders assigned to a specific courier node
   */
  byRider: (riderId: string | undefined) =>
    queryOptions({
      queryKey: [...orderQueries.all(), "rider", riderId],
      enabled: !!riderId,
      queryFn: async () => {
        if (!riderId) return [];
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("assigned_rider_id", riderId);

        if (error) throw error;
        return data || [];
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
