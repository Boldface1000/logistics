/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, FileText, Printer, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { ReceiptModal } from "@/components/ReceiptModal";
import { orderQueries } from "@/lib/api-client";
import type { Tables } from "@/types/database.types";
import { supabase } from "@/integrations/client";

type Order = Tables<"orders">;

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Transaction History — EasyBlue" }] }),
  component: HistoryPage,
});

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function HistoryPage() {
  const loading = useArtificialLoading(400);
  const router = useRouter();
  const [from, setFrom] = useState<string>(todayISO(-30));
  const [to, setTo] = useState<string>(todayISO(0));
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  // Pull auth context from the authenticated layout — same pattern as dashboard.tsx
  const context = Route.useRouteContext() as any;
  const userId: string | undefined = context?.auth?.userId;
  const role: string = context?.auth?.role ?? "customer";

  // Fetch orders from Supabase via the existing query helpers
  const { data: myOrders = [], isLoading: loadingMine } = useQuery(
    orderQueries.mine(role === "customer" || role === "vendor" ? userId : undefined),
  );
  const { data: riderOrders = [], isLoading: loadingRider } = useQuery(
    orderQueries.byRider(role === "rider" ? userId : undefined),
  );

  const { data: allOrders = [], isLoading: loadingAll } = useQuery(
    orderQueries.everything(role === "admin"),
  );

  /** Per-role transaction scope (mirrors old ordersStore scoping). */
  const scoped: Order[] = useMemo(() => {
    if (role === "customer") return myOrders;
    if (role === "rider") return riderOrders;
    if (role === "vendor") return myOrders;
    // admin sees everything — use mine() with no filter; admin queries handled server-side via RLS
    return allOrders;
  }, [role, myOrders, riderOrders, allOrders]);

  const delivered = scoped.filter((o) => o.status === "delivered" || o.status === "cancelled");

  const filtered = useMemo(() => {
    if (!applied) return [];
    const start = new Date(applied.from + "T00:00:00").getTime();
    const end = new Date(applied.to + "T23:59:59").getTime();
    return delivered
      .filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= start && t <= end;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [delivered, applied]);

  const isFetching = loadingMine || loadingRider || loadingAll;

  if (loading || isFetching) {
    return (
      <MobileShell>
        <PageLoader label="History" />
      </MobileShell>
    );
  }

  const proceed = () => {
    if (!from || !to) return;
    if (new Date(from) > new Date(to)) {
      setApplied({ from: to, to: from });
    } else {
      setApplied({ from, to });
    }
  };

  const cancel = () => {
    setFrom(todayISO(-30));
    setTo(todayISO(0));
    setApplied(null);
  };

  const titleByRole =
    (
      {
        customer: "Order History",
        vendor: "Marketplace History",
        rider: "Delivery History",
        admin: "Transaction History",
      } as const
    )[role as "customer" | "vendor" | "rider" | "admin"] ?? "Transaction History";

  return (
    <MobileShell>
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-24">
        <header
          className="safe-top px-5 pt-2 pb-6 bg-primary text-primary-foreground"
          style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.history.back()}
              className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-80">
              EasyBlue Logistics
            </span>
          </div>
          <h1 className="text-2xl font-bold">{titleByRole}</h1>
          <p className="text-sm opacity-80 mt-1">Filter your transactions by date range.</p>
        </header>

        <div className="px-5 pt-5">
          <div className="rounded-2xl bg-card border border-border p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date from">
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-input border border-border text-sm text-foreground"
                />
              </Field>
              <Field label="Date to">
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-input border border-border text-sm text-foreground"
                />
              </Field>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={cancel}
                className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={proceed}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95"
              >
                <CalendarIcon className="h-4 w-4" /> Proceed
              </button>
            </div>
          </div>

          {applied ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">
                  {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {applied.from} → {applied.to}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-card border border-border">
                  <FileText className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No transactions found for that range.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map((o) => (
                    <TxRow key={o.id} order={o} userType={role} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              Pick a date range above, then tap{" "}
              <span className="font-semibold text-foreground">Proceed</span> to load transactions.
            </p>
          )}
        </div>
      </main>
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}

function TxRow({ order, userType }: { order: Order; userType?: string }) {
  const [open, setOpen] = useState(false);
  const d = new Date(order.created_at);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const amount = order.total_cents != null ? `$${(order.total_cents / 100).toFixed(2)}` : "—";
  const tone =
    order.status === "delivered"
      ? "bg-success/10 text-success"
      : order.status === "in_transit"
        ? "bg-primary/10 text-primary"
        : order.status === "declined"
          ? "bg-destructive/10 text-destructive"
          : "bg-cta/10 text-cta";

  return (
    <>
      <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{order.item_description}</p>
          <p className="text-[11px] text-muted-foreground">
            {order.id} · {date} {time}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {order.receiver_name ?? "—"} · {order.receiver_location ?? "—"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{amount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {order.status}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="View receipt"
          className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-95"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>
      <ReceiptModal order={order} open={open} onOpenChange={setOpen} userType={userType} />
    </>
  );
}
