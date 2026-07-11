/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Home,
  Package,
  MapPin,
  Settings as SettingsIcon,
  Truck,
  ChevronRight,
  Navigation,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  Bike,
  ArrowRight,
  Clock,
} from "lucide-react";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { ProfileHeader } from "@/components/ProfileHeader";
import { SupportChat } from "@/components/SupportChat";
import { useTheme } from "@/components/ThemeProvider";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { orderQueries } from "@/lib/api-client";
import { supabase } from "@/integrations/client";
import type { Order } from "@/types/index.ts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EasyBlue Logistics" }] }),
  component: () => <CustomerDashboard variant="customer" />,
});

type Tab = "home" | "orders" | "tracking" | "settings";
type DashboardHomeNav = "/marketplace" | "/park-waybill" | "/standard-booking" | "/stocks";
type AccentVar = "amber" | "cyan" | "emerald" | "zinc";
type StatusKey = "pending" | "accepted" | "in_transit" | "delivered" | "cancelled";

const STATUS_LABEL: Record<StatusKey, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function CustomerDashboard({ variant }: { variant: "customer" | "vendor" }) {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Retrieve shared security and structural details from layout context
  const context = Route.useRouteContext() as any;
  const userProfile = context?.auth?.profile;
  const userId = context?.auth?.userId;

  // Sync real-time updates directly into the active terminal session
  useRealtimeOrders(qc);

  // Stream transit items through custom schema handlers
  const { data: myOrders = [] } = useQuery(orderQueries.mine(userId));
  const pendingForBadge = myOrders.filter((o: Order) => o.status !== "delivered").length;

  if (loading || !userId) {
    return (
      <MobileShell>
        <PageLoader label={variant === "vendor" ? "😴💭..." : "This won't take long"} />
      </MobileShell>
    );
  }

  const displayName =
    userProfile?.first_name ?? (variant === "vendor" ? "Business Account" : "User");

  const openTracking = (id: string) => {
    setActiveOrderId(id);
    setTab("tracking");
  };

  const navTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
    { id: "orders", label: "Orders", icon: <Package className="h-[22px] w-[22px]" /> },
    { id: "tracking", label: "Tracking", icon: <MapPin className="h-[22px] w-[22px]" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-[22px] w-[22px]" /> },
  ];

  return (
    <MobileShell>
      <main className="flex-1 overflow-y-auto scrollbar-hide bg-background">
        {tab === "home" && (
          <HomeHero
            name={displayName}
            variant={variant}
            onGo={(to, search) => navigate(search ? ({ to, search } as any) : { to })}
          />
        )}
        {tab === "orders" && <OrdersPanel orders={myOrders} onView={openTracking} />}
        {tab === "tracking" && (
          <TrackingPanel orders={myOrders} activeId={activeOrderId} onPick={setActiveOrderId} />
        )}
        {tab === "settings" && (
          <SettingsPanel
            user={userProfile}
            onSignOut={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          />
        )}
        <div className="h-4" />
      </main>

      <SupportChat />

      {/* High-End Glassmorphic Bottom Navigation Console */}
      <nav
        className="shrink-0 mx-4 mb-2 z-30 flex items-center justify-between gap-1 px-4 py-2 rounded-full
                   border border-white/20 dark:border-white/5
                   bg-white/40 dark:bg-black/20 backdrop-blur-2xl
                   shadow-[0_8px_32px_rgba(25,25,112,0.15)]"
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
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-foreground/80 hover:text-foreground"
              }`}
              type="button"
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

function HomeHero({
  name,
  variant,
  onGo,
}: {
  name: string;
  variant: "customer" | "vendor";
  onGo: (to: DashboardHomeNav, search?: { type: "intra_state" | "inter_state" }) => void;
}) {
  const buttons: {
    header: string;
    subheader: string;
    to: DashboardHomeNav;
    search?: { type: "intra_state" | "inter_state" };
    icon: React.ReactNode;
    accentVar: AccentVar;
  }[] = [
    {
      header: "Intra-State",
      subheader: "Local Delivery",
      to: "/standard-booking",
      search: { type: "intra_state" },
      icon: <Bike className="h-5 w-5" />,
      accentVar: "amber",
    },
    {
      header: "Inter-State",
      subheader: "Send Items outside the State",
      to: "/standard-booking",
      search: { type: "inter_state" },
      icon: <Truck className="h-5 w-5" />,
      accentVar: "zinc",
    },
    {
      header: "Park Waybill",
      subheader: "Book Waybill",
      to: "/park-waybill",
      icon: <Truck className="h-5 w-5" />,
      accentVar: "cyan",
    },
    {
      header: variant === "vendor" ? "Stocks" : "Marketplace",
      subheader: variant === "vendor" ? "Inventory updates" : "Partner pricing",
      to: variant === "vendor" ? "/stocks" : "/marketplace",
      icon: <Package className="h-5 w-5" />,
      accentVar: "emerald",
    },
  ];

  return (
    <>
      <section className="safe-top px-5 pt-2 pb-6 bg-primary text-primary-foreground rounded-b-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70">EasyBlue Logistics</p>
              <p className="text-xs font-bold leading-tight">
                {variant === "vendor" ? "Vendor Node" : "Customer Portal"}
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold leading-tight">Hello, {name}</h1>
        <p className="text-sm opacity-80 mt-1">How may we help you today?</p>
      </section>

      <div className="px-4 pt-5">
        <h2 className="text-sm font-bold text-foreground mb-3">Delivery Scope</h2>

        <div className="grid grid-cols-2 gap-2.5">
          {buttons.map((b) => (
            <BubbleButton
              key={b.header}
              header={b.header}
              subheader={b.subheader}
              icon={b.icon}
              accentVar={b.accentVar}
              onClick={() => onGo(b.to, b.search)}
            />
          ))}
        </div>

        <div className="pt-5">
          <h2 className="text-sm font-bold text-foreground mb-2">Workspace Overview</h2>
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pick a service above to configure fulfillment items. After operations commits a
              dispatch modification, assignable details are instantly piped to your active real-time
              panels.
            </p>
            <br />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Note: Significant charges will be incurred if a drop-off location is changed from
              intial info in booking form.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function BubbleButton({
  header,
  subheader,
  icon,
  onClick,
  accentVar,
}: {
  header: string;
  subheader: string;
  icon: React.ReactNode;
  onClick: () => void;
  accentVar: AccentVar;
}) {
  const accentColor =
    accentVar === "amber"
      ? "rgba(245, 158, 11, 0.3)"
      : accentVar === "cyan"
        ? "rgba(6, 182, 212, 0.3)"
        : accentVar === "zinc"
          ? "rgba(113, 113, 122, 0.3)"
          : "rgba(16, 185, 129, 0.3)";

  return (
    <button
      onClick={onClick}
      className="h-20 w-full relative overflow-hidden flex items-start gap-3 p-3 rounded-2xl
                 font-bold text-sm text-foreground border border-border bg-card
                 hover:bg-accent/50 active:scale-95 transition"
      type="button"
      aria-label={header}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none transition-opacity"
        style={{ backgroundColor: accentColor }}
      />
      <div className="relative z-10 flex items-center justify-center h-9 w-9 rounded-xl bg-secondary text-primary">
        {icon}
      </div>
      <div className="relative z-10 flex-1 min-w-0 text-left">
        <span className="block text-[12px] font-bold text-foreground">{header}</span>
        <span className="block text-[10px] font-medium text-muted-foreground truncate mt-0.5">
          {subheader}
        </span>
      </div>
    </button>
  );
}

function OrdersPanel({ orders, onView }: { orders: Order[]; onView: (id: string) => void }) {
  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const completed = orders.filter((o) => o.status === "delivered");

  return (
    <div className="safe-top px-5 pt-2">
      <h2 className="text-xl font-bold text-foreground mb-4">My Waybills</h2>

      {orders.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No transit records located on this terminal account index.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {active.length > 0 && (
            <Section title="In Transit" count={active.length} accent="bg-primary">
              {active.map((o) => (
                <OrderRow key={o.id} order={o} onView={onView} />
              ))}
            </Section>
          )}
          {completed.length > 0 && (
            <Section title="Completed" count={completed.length} accent="bg-emerald-500">
              {completed.map((o) => (
                <OrderRow key={o.id} order={o} onView={onView} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accent} text-white`}>
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function OrderRow({ order, onView }: { order: Order; onView: (id: string) => void }) {
  return (
    <button
      onClick={() => onView(order.id)}
      className="w-full text-left p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 active:scale-[0.99] hover:bg-accent/30 transition"
      type="button"
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground truncate">
          {order.item_description || "Waybill Package"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          ID: {order.id.slice(0, 8).toUpperCase()} •{" "}
          {STATUS_LABEL[order.status as StatusKey] ?? order.status}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function TrackingPanel({
  orders,
  activeId,
  onPick,
}: {
  orders: Order[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const active = (activeId ? orders.find((o) => o.id === activeId) : null) ?? orders[0];

  if (!active) {
    return (
      <div className="safe-top px-5 pt-2">
        <h2 className="text-xl font-bold text-foreground mb-4">Live Tracking</h2>
        <div className="text-center py-12 rounded-2xl bg-card border border-border">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No active nodes to parse tracking maps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top px-5 pt-2">
      <h2 className="text-xl font-bold text-foreground mb-1">Live Tracking</h2>
      <p className="text-xs text-muted-foreground mb-3">
        {active.id.slice(0, 8).toUpperCase()} · {active.item_description || "Waybill Item"}
      </p>

      {orders.length > 1 && (
        <select
          value={active.id}
          onChange={(e) => onPick(e.target.value)}
          className="mb-3 w-full h-10 px-3 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id.slice(0, 8).toUpperCase()} · {o.item_description}
            </option>
          ))}
        </select>
      )}

      {/* Modern High-End Transit Mapping Engine Visualizer */}
      <div className="relative h-60 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-secondary/50 to-background mb-4 shadow-inner">
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-muted-foreground"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
        >
          <path
            d="M 40 200 Q 130 160 180 130 T 280 70 Q 330 50 360 40"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
        </svg>

        <div className="absolute bottom-6 left-6 flex flex-col items-center">
          <div className="h-3 w-3 rounded-full bg-muted-foreground ring-4 ring-muted-foreground/20" />
          <span className="text-[9px] font-bold text-foreground bg-card px-1.5 py-0.5 rounded mt-1 shadow-sm">
            Pickup
          </span>
        </div>

        {(active.status === "accepted" || active.status === "in_transit") && (
          <div className="absolute top-24 right-32 flex flex-col items-center animate-pulse">
            <div className="h-5 w-5 rounded-full bg-primary ring-4 ring-primary/30 flex items-center justify-center shadow-md">
              <Navigation className="h-3 w-3 text-primary-foreground rotate-45" />
            </div>
            <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded mt-1 shadow-sm">
              Courier
            </span>
          </div>
        )}

        <div className="absolute top-6 right-6 flex flex-col items-center">
          <MapPin className="h-5 w-5 text-primary drop-shadow" />
          <span className="text-[9px] font-bold text-foreground bg-card px-1.5 py-0.5 rounded mt-0.5 shadow-sm">
            Drop-off
          </span>
        </div>

        <div className="absolute bottom-2 left-2 text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded shadow-sm">
          {STATUS_LABEL[active.status as StatusKey] ?? active.status}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 space-y-2.5 text-xs">
        <Row label="Pickup Address" value={active.sender_location || "Terminal Office Address"} />
        <Row label="Drop-off Destination" value={active.receiver_location || "N/A"} />
        <Row
          label="Assigned Courier Rider"
          value={
            active.assigned_rider_id ? "Courier Allocation Active" : "Awaiting Allocations Desk"
          }
        />
        <Row
          label="Status Metric"
          value={STATUS_LABEL[active.status as StatusKey] ?? active.status}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold text-right max-w-[65%] truncate">{value}</span>
    </div>
  );
}

function SettingsPanel({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="safe-top px-5 pt-2">
      <h2 className="text-xl font-bold text-foreground mb-4">Settings Workspace</h2>

      <ProfileHeader
        user={
          user
            ? {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role ?? "customer",
                approval: user.approval ?? "pending",
              }
            : null
        }
      />

      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={toggle}
          className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 active:scale-[0.99] hover:bg-accent/30 transition"
          type="button"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : (
            <Moon className="h-5 w-5 text-primary" />
          )}
          <span className="text-sm font-semibold text-foreground flex-1 text-left">
            Dark UI Workspace
          </span>
          <span className="text-xs text-muted-foreground">
            {theme === "dark" ? "Active" : "Disabled"}
          </span>
        </button>

        <Link
          to="/terms"
          className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 active:scale-[0.99] hover:bg-accent/30 transition"
        >
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground flex-1 text-left">
            Terms & Protocols
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        < InstallAppBanner/>
        
        <button
          onClick={onSignOut}
          className="w-full p-4 rounded-2xl bg-destructive/10 text-destructive flex items-center gap-3 active:scale-[0.99] font-bold text-sm border border-destructive/10 hover:bg-destructive/15 transition mt-2"
          type="button"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
