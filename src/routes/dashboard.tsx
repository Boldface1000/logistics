import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Home, Package, MapPin, Settings as SettingsIcon, Truck, Clock,
  ChevronRight, ArrowRight, Navigation, CheckCircle2, LogOut, Moon, Sun, ShieldCheck,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { ProfileHeader } from "@/components/ProfileHeader";
import { SupportChat } from "@/components/SupportChat";
import { useTheme } from "@/components/ThemeProvider";
import { auth, type AuthUser } from "@/lib/auth";
import { ordersStore, type OrderRecord } from "@/lib/orders-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EasyBlue" }] }),
  component: () => <CustomerDashboard variant="customer" />,
});

type Tab = "home" | "orders" | "tracking" | "settings";

function useOrders() {
  return useSyncExternalStore(
    (cb) => ordersStore.subscribe(cb),
    () => JSON.stringify(ordersStore.list()),
    () => "[]",
  );
}

/** Shared dashboard used by both customer and vendor routes. */
export function CustomerDashboard({ variant }: { variant: "customer" | "vendor" }) {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  useOrders();

  useEffect(() => {
    const u = auth.current();
    setUser(u);
  }, []);

  if (loading) return <MobileShell><PageLoader label={variant === "vendor" ? "Vendor Dashboard" : "Dashboard"} /></MobileShell>;

  const displayName = user?.firstName ?? (variant === "vendor" ? "Partner" : "Guest");
  const myOrders = user ? ordersStore.byCustomer(user.email) : [];
  const pendingForBadge = myOrders.filter((o) => o.status !== "delivered").length;

  const openTracking = (id: string) => { setActiveOrderId(id); setTab("tracking"); };

  const navTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
    { id: "orders", label: "Orders", icon: <Package className="h-[22px] w-[22px]" /> },
    { id: "tracking", label: "Tracking", icon: <MapPin className="h-[22px] w-[22px]" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-[22px] w-[22px]" /> },
  ];

  return (
    <MobileShell>
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {tab === "home" && (
          <HomeHero name={displayName} variant={variant} onGo={(to) => navigate({ to })} />
        )}
        {tab === "orders" && (
          <OrdersPanel orders={myOrders} onView={openTracking} />
        )}
        {tab === "tracking" && (
          <TrackingPanel orders={myOrders} activeId={activeOrderId} onPick={setActiveOrderId} />
        )}
        {tab === "settings" && (
          <SettingsPanel user={user} onSignOut={() => { auth.signOut(); navigate({ to: "/" }); }} />
        )}
        <div style={{ height: "10px" }} />
      </main>

      <SupportChat />

      {/* Sticky bottom navbar — sits at bottom of flex column, scrolls away with content */}
      <nav
        className="mt-auto mx-4 mb-2 z-30 flex items-center justify-between gap-1 px-4 py-2 rounded-full
                   border border-white/30 dark:border-white/10
                   bg-white/30 dark:bg-white/5 backdrop-blur-2xl
                   shadow-[0_8px_32px_rgba(25,25,112,0.25)]"
        style={{ marginBottom: `calc(env(safe-area-inset-bottom, 0px) + 6px)` }}
      >
        {navTabs.map((t) => {
          const active = tab === t.id;
          const showDot = t.id === "orders" && pendingForBadge > 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              className={`relative h-11 w-11 rounded-full flex items-center justify-center transition active:scale-90 ${
                active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-foreground/80"
              }`}
            >
              {t.icon}
              {showDot && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-cta ring-2 ring-background animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </MobileShell>
  );
}

/* -------------------- HOME HERO -------------------- */

function HomeHero({ name, variant, onGo }: { name: string; variant: "customer" | "vendor"; onGo: (to: "/marketplace" | "/park-waybill" | "/standard-booking" | "/stocks") => void }) {
  const buttons: { label: string; to: "/marketplace" | "/park-waybill" | "/standard-booking" | "/stocks" }[] = [
    { label: "Marketplace", to: "/marketplace" },
    { label: "Park Waybill", to: "/park-waybill" },
    { label: "Local Delivery", to: "/standard-booking" },
    ...(variant === "vendor" ? [{ label: "Stocks" as const, to: "/stocks" as const }] : []),
  ];
  return (
    <>
      {/* Primary hero with bottom corners rounded 12px */}
      <section
        className="safe-top px-5 pt-2 pb-6 bg-primary text-primary-foreground"
        style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70">EasyBlue</p>
              <p className="text-xs font-bold leading-tight">{variant === "vendor" ? "Vendor" : "Customer"}</p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold leading-tight">Hello, {name}</h1>
        <p className="text-sm opacity-80 mt-1">How may we help you today?</p>

        {/* 2-column grid of white bubble buttons, midnight blue text */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {buttons.map((b) => (
            <BubbleButton key={b.label} label={b.label} onClick={() => onGo(b.to)} />
          ))}
        </div>
      </section>

      <div className="px-4 pt-5">
        <h2 className="text-sm font-bold text-foreground mb-2">Tips</h2>
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pick a service above to start. After you place an order, the records desk will assign a rider and you'll see live updates in <span className="text-foreground font-semibold">Orders</span> and <span className="text-foreground font-semibold">Tracking</span>.
          </p>
        </div>
      </div>
    </>
  );
}

function BubbleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center py-4 px-3 rounded-2xl
                 bg-white text-[#191970] font-bold text-sm
                 border border-white/40 backdrop-blur-xl
                 active:scale-95 transition shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
    >
      {label}
    </button>
  );
}

/* -------------------- ORDERS -------------------- */

function OrdersPanel({ orders, onView }: { orders: OrderRecord[]; onView: (id: string) => void }) {
  const active = orders.filter((o) => o.status !== "delivered");
  const completed = orders.filter((o) => o.status === "delivered");

  return (
    <div className="safe-top px-5 pt-2">
      <h2 className="text-xl font-bold text-foreground mb-4">My Orders</h2>

      {orders.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No orders yet — place one from the home screen.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && <Section title="In progress" count={active.length} accent="bg-cta">
            {active.map((o) => <OrderRow key={o.id} order={o} onView={onView} />)}
          </Section>}
          {completed.length > 0 && <Section title="Completed" count={completed.length} accent="bg-success">
            {completed.map((o) => <OrderRow key={o.id} order={o} onView={onView} />)}
          </Section>}
        </>
      )}
    </div>
  );
}

function Section({ title, count, accent, children }: { title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

const STATUS_LABEL: Record<OrderRecord["status"], string> = {
  pending: "Awaiting dispatch",
  assigned: "Rider assigned — awaiting acceptance",
  accepted: "Rider accepted — preparing pickup",
  declined: "Reassigning rider",
  in_transit: "In transit",
  delivered: "Delivered",
};

function OrderRow({ order, onView }: { order: OrderRecord; onView: (id: string) => void }) {
  const Icon = order.status === "delivered" ? CheckCircle2 : order.status === "in_transit" ? Truck : Clock;
  const tone = order.status === "delivered" ? "bg-success/10 text-success" : order.status === "in_transit" ? "bg-primary/10 text-primary" : "bg-cta/10 text-cta";
  return (
    <div className="p-3.5 rounded-2xl bg-card border border-border">
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{order.itemDescription}</p>
          <p className="text-xs text-muted-foreground">{order.id} · {STATUS_LABEL[order.status]}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <button
        onClick={() => onView(order.id)}
        className="mt-2 text-xs font-semibold text-primary flex items-center gap-1 active:opacity-70"
      >
        View details <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* -------------------- TRACKING -------------------- */

function TrackingPanel({ orders, activeId, onPick }: { orders: OrderRecord[]; activeId: string | null; onPick: (id: string) => void }) {
  const active = orders.find((o) => o.id === activeId) ?? orders[0];

  if (!active) {
    return (
      <div className="safe-top px-5 pt-2">
        <h2 className="text-xl font-bold text-foreground mb-4">Live Tracking</h2>
        <div className="text-center py-12 rounded-2xl bg-card border border-border">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No active orders to track.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top px-5 pt-2">
      <h2 className="text-xl font-bold text-foreground mb-1">Live Tracking</h2>
      <p className="text-xs text-muted-foreground mb-3">{active.id} · {active.itemDescription}</p>

      {orders.length > 1 && (
        <select
          value={active.id}
          onChange={(e) => onPick(e.target.value)}
          className="mb-3 w-full h-10 px-3 rounded-xl bg-input border border-border text-sm text-foreground"
        >
          {orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.itemDescription}</option>)}
        </select>
      )}

      {/* Mock map */}
      <div className="relative h-60 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-secondary to-accent mb-4">
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <defs>
            <pattern id="gd" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gd)" />
        </svg>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none">
          <path d="M 30 210 Q 110 170 150 140 T 250 80 Q 310 55 370 45" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" className="text-primary" />
        </svg>
        <div className="absolute bottom-6 left-5 flex flex-col items-center">
          <div className="h-3 w-3 rounded-full bg-muted-foreground" />
          <span className="text-[9px] font-bold text-foreground bg-card px-1.5 py-0.5 rounded mt-1 shadow truncate max-w-[100px]">Pickup</span>
        </div>
        {(active.status === "accepted" || active.status === "in_transit") && (
          <div className="absolute top-20 right-24 flex flex-col items-center animate-pulse">
            <div className="h-5 w-5 rounded-full bg-cta ring-4 ring-cta/30 flex items-center justify-center">
              <Navigation className="h-3 w-3 text-cta-foreground" />
            </div>
            <span className="text-[9px] font-bold text-cta-foreground bg-cta px-1.5 py-0.5 rounded mt-1 shadow">Rider</span>
          </div>
        )}
        <div className="absolute top-5 right-4 flex flex-col items-center">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="text-[9px] font-bold text-foreground bg-card px-1.5 py-0.5 rounded mt-0.5 shadow">Drop-off</span>
        </div>
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 px-2 py-1 rounded">
          {STATUS_LABEL[active.status]}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 space-y-2 text-xs">
        <Row label="Pickup" value={active.pickup} />
        <Row label="Drop-off" value={active.dropoff} />
        <Row label="Rider" value={active.assignedRiderName ?? "—"} />
        <Row label="Status" value={STATUS_LABEL[active.status]} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

/* -------------------- SETTINGS -------------------- */

function SettingsPanel({ user, onSignOut }: { user: AuthUser | null; onSignOut: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="safe-top px-5 pt-2">
      <h2 className="text-xl font-bold text-foreground mb-4">Settings</h2>

      <ProfileHeader user={user} />


      <button onClick={toggle} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 mb-2 active:scale-[0.99]">
        {theme === "dark" ? <Sun className="h-5 w-5 text-cta" /> : <Moon className="h-5 w-5 text-primary" />}
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Dark mode</span>
        <span className="text-xs text-muted-foreground">{theme === "dark" ? "On" : "Off"}</span>
      </button>

      <Link to="/terms" className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 mb-2 active:scale-[0.99]">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Terms of Use</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
      <Link to="/privacy" className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 mb-3 active:scale-[0.99]">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Privacy & Security</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <button onClick={onSignOut} className="w-full p-4 rounded-2xl bg-destructive/10 text-destructive flex items-center gap-3 active:scale-[0.99] font-semibold text-sm">
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </div>
  );
}
