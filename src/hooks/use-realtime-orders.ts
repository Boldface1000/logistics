import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/client";
import { orderQueries } from "@/lib/api-client";

/**
 * Subscribe to realtime changes on `orders` (INSERT + UPDATE only)
 * and invalidate TanStack Query caches.
 *
 * Usage:
 * const qc = useQueryClient();
 * useRealtimeOrders(qc);
 */
export function useRealtimeOrders(queryClient: QueryClient) {
  useEffect(() => {
    let mounted = true;

    const invalidate = () => {
      if (!mounted) return;
      // Replaced undefined queryKeys object with correct api-client method
      queryClient.invalidateQueries({ queryKey: orderQueries.all() });
    };

    const channel = supabase
      .channel("realtime:orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, invalidate);

    // Track state and prevent connection retry cascades
    channel.subscribe((status, err) => {
      if (err && import.meta.env.DEV) {
        console.error(`[realtime:orders] Subscription channel exception: ${status}`, err);
      }
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
