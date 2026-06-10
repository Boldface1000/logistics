import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Package, Calendar, Layers } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { auth, type AuthUser } from "@/lib/auth";
import { stocksStore } from "@/lib/stocks-store";

export const Route = createFileRoute("/stocks")({
  head: () => ({ meta: [{ title: "Stocks — EasyBlue" }] }),
  component: VendorStocksPage,
});

function useStocks() {
  return useSyncExternalStore(
    (cb) => stocksStore.subscribe(cb),
    () => JSON.stringify(stocksStore.list()),
    () => "[]",
  );
}

function VendorStocksPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  useStocks();
  useEffect(() => { setUser(auth.current()); }, []);

  const items = user ? stocksStore.byVendor(user.email) : [];

  return (
    <MobileShell>
      <header className="safe-top px-5 pt-2 pb-5 bg-primary text-primary-foreground"
        style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/vendor-dashboard" })}
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Live</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-3">My Stocks</h1>
        <p className="text-sm opacity-80">Updated by the Product Admin in real-time.</p>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide pb-10 px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-card border border-border">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No stock recorded yet.</p>
            <p className="text-[11px] text-muted-foreground mt-1">The Product Admin will update this list once approved.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((s) => (
              <div key={s.id} className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
                {s.imageDataUrl ? (
                  <img src={s.imageDataUrl} alt={s.productType} className="h-14 w-14 rounded-xl object-cover" />
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
