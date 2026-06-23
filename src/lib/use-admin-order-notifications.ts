/**
 * useAdminOrderNotifications
 *
 * Subscribes to Supabase Realtime on the `orders` table and dispatches
 * in-app toasts (via sonner) + browser Notification API alerts whenever
 * the four key order-lifecycle events occur:
 *
 *   INSERT  → order.placed   (customer just placed a new delivery order)
 *   UPDATE  → order.assigned (admin dispatched an order to a rider)
 *   UPDATE  → order.accepted (rider accepted their assigned order)
 *   UPDATE  → order.delivered (rider marked the delivery successful)
 *
 * Usage — drop this into ScopeShell (or any admin layout component):
 *
 *   import { useAdminOrderNotifications } from "@/hooks/use-admin-order-notifications";
 *
 *   function ScopeShell(...) {
 *     useAdminOrderNotifications();
 *     ...
 *   }
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";

// ─── Types matching the `orders` table row shape ─────────────────────────────

interface OrderRow {
  id: string;
  status: "pending" | "assigned" | "accepted" | "in_transit" | "delivered";
  item_description?: string;
  assigned_rider_name?: string;
  assigned_rider_id?: string;
  customer_id?: string;
}

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: OrderRow;
  old: Partial<OrderRow>;
}

// ─── Browser Notification helper ─────────────────────────────────────────────

function requestNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      // Permission prompt blocked — silent, no crash
    });
  }
}

function fireBrowserNotification(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.png" });
  } catch {
    // Some browsers (e.g. Safari 15) throw on Notification constructor — ignore
  }
}

// ─── The hook ────────────────────────────────────────────────────────────────

export function useAdminOrderNotifications() {
  // Track last-seen statuses so UPDATE events only fire once per transition
  const seenStatuses = useRef<Map<string, OrderRow["status"]>>(new Map());

  useEffect(() => {
    // Ask for browser notification permission on first mount
    requestNotificationPermission();

    const handleChange = (payload: RealtimePayload) => {
      const row = payload.new;
      const prevStatus = seenStatuses.current.get(row.id);

      if (payload.eventType === "INSERT") {
        // ── New order placed by customer ──────────────────────────────────
        const desc = row.item_description ?? "Delivery";
        const shortId = row.id.slice(0, 8).toUpperCase();

        toast.info(`📦 New order: ${desc}`, {
          description: `Order #${shortId} is waiting to be dispatched.`,
          duration: 6000,
        });
        fireBrowserNotification(
          "📦 New Delivery Order",
          `Order #${shortId}: ${desc} awaits dispatch.`,
          `order-placed-${row.id}`,
        );

        seenStatuses.current.set(row.id, row.status);
        return;
      }

      if (payload.eventType === "UPDATE" && row.status !== prevStatus) {
        seenStatuses.current.set(row.id, row.status);
        const shortId = row.id.slice(0, 8).toUpperCase();
        const rider = row.assigned_rider_name ?? "a rider";

        switch (row.status) {
          case "assigned":
            toast.message(`🚴 Order dispatched to ${rider}`, {
              description: `Order #${shortId} has been assigned.`,
              duration: 5000,
            });
            fireBrowserNotification(
              "🚴 Order Assigned",
              `Order #${shortId} dispatched to ${rider}.`,
              `order-assigned-${row.id}`,
            );
            break;

          case "accepted":
            toast.success(`✅ ${rider} accepted order #${shortId}`, {
              description: "Rider is preparing for pickup.",
              duration: 5000,
            });
            fireBrowserNotification(
              "✅ Rider Accepted",
              `${rider} accepted order #${shortId} and is en route.`,
              `order-accepted-${row.id}`,
            );
            break;

          case "delivered":
            toast.success(`🎉 Order #${shortId} delivered!`, {
              description: `${rider} completed this delivery successfully.`,
              duration: 7000,
            });
            fireBrowserNotification(
              "🎉 Delivery Successful",
              `Order #${shortId} delivered by ${rider}.`,
              `order-delivered-${row.id}`,
            );
            break;

          default:
            // in_transit and other intermediate states — no admin alert needed
            break;
        }
      }
    };

    const channel = supabase
      .channel("admin:order-lifecycle")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (p) => handleChange({ ...p, eventType: "INSERT" } as RealtimePayload),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (p) => handleChange({ ...p, eventType: "UPDATE" } as RealtimePayload),
      );

    channel.subscribe((status, err) => {
      if (err && import.meta.env.DEV) {
        console.error("[admin:order-lifecycle] Subscription error:", status, err);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
