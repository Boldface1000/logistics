import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Package, Calendar, Layers } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { stocksStore } from "@/lib/stocks-store";

export const Route = createFileRoute("/_authenticated/stocks")({
  head: () => ({ meta: [{ title: "Stocks — EasyBlue" }] }),
  component: VendorStocksPage,
});

function VendorStocksPage() {
  const navigate = useNavigate();

  // Connect cleanly to your centralized parent authenticated layout parameters
  const { auth } = Route.useRouteContext() as any;
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!auth?.userId) return;

    // Local hook synchronizer tracks memory store state updates performantly
    const syncInventory = () => {
      // Look up stock records matching the current authenticated profile identifier
      const currentStocks = stocksStore.byVendor(auth.userId);
      setItems(currentStocks);
    };

    syncInventory();
    const unsubscribe = stocksStore.subscribe(syncInventory);
    return () => unsubscribe();
  }, [auth?.userId]);

  return (
    <MobileShell>
      <header
        className="safe-top px-5 pt-2 pb-5 bg-primary text-primary-foreground"
        style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/vendor-dashboard" })}
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center active:scale-95"
            aria-label="Navigate Back"
          >
            <ArrowLeft className="h-4 w-4 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
            <Layers className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Inventory Hub
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-3">Stock Ledger</h1>
        <p className="text-sm opacity-80">Track and manage your real-time cold room holdings</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6 scrollbar-hide">
        {items.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-card border border-border">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">No stock allocations registered</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] mx-auto">
              Your materials manifest appears clear. New shipments will show here once approved.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3"
              >
                {s.imageDataUrl ? (
                  <img
                    src={s.imageDataUrl}
                    alt={s.productType}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{s.productType}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" /> Received {s.receivedAt}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary leading-none">{s.quantity}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">qty</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </MobileShell>
  );
}
