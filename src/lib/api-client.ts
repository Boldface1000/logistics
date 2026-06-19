import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";

export const orderQueries = {
  all: () => ["orders"] as const,

  /**
   * Fetches orders created by the current authenticated customer profile
   */
  mine: () =>
    queryOptions({
      queryKey: [...orderQueries.all(), "mine"],
      queryFn: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("No active user session found.");

        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", session.user.id);

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
