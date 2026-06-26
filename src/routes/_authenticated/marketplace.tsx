/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
// src/routes/_authenticated/marketplace.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plane, Package, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — EasyBlue logistics" }] }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    auth.current().then((u) => setRole(u?.role ?? null));
  }, []);

  const { data: stocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ["marketplace-stocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_stocks")
        .select(
          `
          id,
          vendor_id,
          product_type,
          quantity,
          price_cents,
          image_url,
          vendors (
            registered_business_name
          )
        `,
        )
        .gt("quantity", 0) // only show items that are in stock
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (loading || stocksLoading)
    return (
      <MobileShell>
        <PageLoader label="Marketplace" />
      </MobileShell>
    );

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-3 flex items-center gap-3 border-b border-border">
        <Link
          to={backTarget(role)}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Marketplace</h1>
          <p className="text-xs text-muted-foreground">Import inventory</p>
        </div>
        <Plane className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6 scrollbar-hide">
        {stocks.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No items available right now.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stocks.map((item) => (
              <div key={item.id} className="rounded-2xl bg-card border border-border p-3">
                <div className="h-24 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-primary mb-2 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_type}
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    <Package className="h-7 w-7" />
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {(item.vendors as any)?.registered_business_name ?? "Vendor"}
                </p>
                <p className="text-sm font-semibold text-foreground line-clamp-1">
                  {item.product_type}
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-cta">
                    ₦{(item.price_cents / 100).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">· {item.quantity} left</span>
                </div>
                <button
                  onClick={() => navigate({ to: "/_authenticated/marketplace-checkout" })}
                  className="mt-2 w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 active:scale-95"
                >
                  Order
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </MobileShell>
  );
}

function backTarget(role: string | null): "/dashboard" | "/vendor-dashboard" {
  return role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
