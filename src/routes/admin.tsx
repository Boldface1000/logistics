import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft, Users, Truck, Package, CheckCircle2, XCircle, Plus, Edit3, Trash2,
  ClipboardList, Activity, MapPin, Store, Bike, Mail, Phone, BadgeCheck,
  Home, Inbox, Layers, LogOut, ShieldCheck, BarChart3, User as UserIcon,
  MessageSquare, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { ProfileHeader } from "@/components/ProfileHeader";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AdminChatDialog } from "@/components/admin/AdminChatDialog";
import { AdminUsersDialog } from "@/components/admin/AdminUsersDialog";
import { AdminQrShareDialog } from "@/components/admin/AdminQrShareDialog";
import { auth, type AdminScope, type AuthUser } from "@/lib/auth";
import { pendingStore, type PendingSignup } from "@/lib/pending-store";
import { ordersStore, type OrderRecord } from "@/lib/orders-store";
import { ridersStore } from "@/lib/riders-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — EasyBlue" }] }),
  component: AdminPage,
});

function usePending() {
  return useSyncExternalStore(
    (cb) => pendingStore.subscribe(cb),
    () => JSON.stringify(pendingStore.list()),
    () => "[]",
  );
}
function useOrders() {
  return useSyncExternalStore(
    (cb) => ordersStore.subscribe(cb),
    () => JSON.stringify(ordersStore.list()),
    () => "[]",
  );
}

function AdminPage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { setUser(auth.current()); }, []);

  // Dev override: when no auth (or non-admin), allow super by default for the demo
  const scope: AdminScope = user?.adminScope ?? "super";

  if (loading) return <MobileShell><PageLoader label="Admin Console" /></MobileShell>;

  return (
    <MobileShell>
      <ScopeShell scope={scope} user={user} onSignOut={() => { auth.signOut(); navigate({ to: "/" }); }} />
    </MobileShell>
  );
}

/* ---------- shell with per-scope bottom nav ---------- */

type SuperTab = "home" | "profile" | "stats" | "settings";
type LogisticsTab = "home" | "inbox" | "telemetry" | "catalog" | "settings";

function ScopeShell({ scope, user, onSignOut }: { scope: AdminScope; user: AuthUser | null; onSignOut: () => void }) {
  usePending(); useOrders();
  const [tab, setTab] = useState<string>("home");

  const navs: Record<AdminScope, { id: string; label: string; icon: React.ReactNode; badge?: number }[]> = {
    super: [
      { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
      { id: "profile", label: "Profile", icon: <UserIcon className="h-[22px] w-[22px]" />, badge: pendingStore.pending().length },
      { id: "stats", label: "Stats", icon: <BarChart3 className="h-[22px] w-[22px]" /> },
      { id: "settings", label: "Settings", icon: <ShieldCheck className="h-[22px] w-[22px]" /> },
    ],
    logistics: [
      { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
      { id: "inbox", label: "Inbox", icon: <Inbox className="h-[22px] w-[22px]" />, badge: ordersStore.pending().length },
      { id: "telemetry", label: "Telemetry", icon: <Activity className="h-[22px] w-[22px]" /> },
      { id: "catalog", label: "Catalog", icon: <Layers className="h-[22px] w-[22px]" /> },
      { id: "settings", label: "Settings", icon: <ShieldCheck className="h-[22px] w-[22px]" /> },
    ],
  };

  const tabs = navs[scope];
  const title = ({ super: "Super Admin", logistics: "Operations Admin" } as const)[scope];

  return (
    <>
      <header className="safe-top px-5 pt-2 pb-5 bg-primary text-primary-foreground"
        style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
        <div className="flex items-center justify-between">
          <Link to="/" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-primary-foreground" />
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Live</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-3">Hello, {user?.firstName ?? "Admin"}</h1>
        <p className="text-sm opacity-80">{title} · How may we help you today?</p>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-4">
        {scope === "super" && <SuperScope tab={tab as SuperTab} onSignOut={onSignOut} />}
        {scope === "logistics" && <LogisticsScope tab={tab as LogisticsTab} onSignOut={onSignOut} />}
      </main>

      <nav
        className="mt-auto mx-4 z-30 flex items-center justify-between gap-1 px-4 py-2 rounded-full
                   border border-white/30 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-2xl
                   shadow-[0_8px_32px_rgba(25,25,112,0.25)]"
        style={{ marginBottom: `calc(env(safe-area-inset-bottom, 0px) + 6px)` }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} aria-label={t.label}
              className={`relative h-11 w-11 rounded-full flex items-center justify-center transition active:scale-90 ${
                active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-foreground/80"
              }`}>
              {t.icon}
              {t.badge && t.badge > 0 ? (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-cta text-cta-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </>
  );
}

/* ---------- SUPER ---------- */

function SuperScope({ tab, onSignOut }: { tab: SuperTab; onSignOut: () => void }) {
  usePending();
  if (tab === "profile") return <ProfileApprovals />;
  if (tab === "stats") return <SuperStats />;
  if (tab === "settings") return <SignOut onSignOut={onSignOut} />;
  return <SuperHome />;
}

function SuperHome() {
  const pendingCount = pendingStore.pending().length;
  const orderCount = ordersStore.list().length;
  const [chatOpen, setChatOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const actions = [
    { label: "Chat", icon: <MessageSquare className="h-5 w-5" />, onClick: () => setChatOpen(true), tone: "bg-cta/10 text-cta" },
    { label: "Users", icon: <Users className="h-5 w-5" />, onClick: () => setUsersOpen(true), tone: "bg-primary/10 text-primary" },
    { label: "Share", icon: <Share2 className="h-5 w-5" />, onClick: () => setShareOpen(true), tone: "bg-success/10 text-success" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Admin tools</h3>
        <DarkModeToggle />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="p-3 rounded-2xl bg-card border border-border flex flex-col items-center gap-2 active:scale-95"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.tone}`}>{a.icon}</div>
            <span className="text-xs font-semibold text-foreground">{a.label}</span>
          </button>
        ))}
      </div>

      <KPI label="Pending signups" val={String(pendingCount)} tone="cta" />
      <KPI label="Active orders"  val={String(orderCount)} tone="primary" />
      <p className="text-xs text-muted-foreground">Use the Profile tab to approve new riders and partners. The red dot indicates pending submissions.</p>

      <AdminChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      <AdminUsersDialog open={usersOpen} onOpenChange={setUsersOpen} />
      <AdminQrShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

function SuperStats() {
  usePending(); useOrders();
  const all = pendingStore.list();
  const approvedVendors = all.filter((p) => p.role === "partner" && p.status === "approved").length;
  const approvedRiders = all.filter((p) => p.role === "rider" && p.status === "approved").length;
  const totalDeliveries = ordersStore.list().filter((o) => o.status === "delivered").length;
  // Seeded customer + signed-in customers (proxy)
  const totalCustomers = 1 + all.filter((p) => p.role === "partner").length; // partners often onboard with a customer record

  const kpis = [
    { label: "Total Deliveries", val: String(totalDeliveries), trend: "live", icon: <Truck className="h-4 w-4" /> },
    { label: "Active Riders", val: String(approvedRiders), trend: "live", icon: <Users className="h-4 w-4" /> },
    { label: "Customers", val: String(totalCustomers), trend: "live", icon: <Users className="h-4 w-4" /> },
    { label: "Vendors", val: String(approvedVendors), trend: "live", icon: <Package className="h-4 w-4" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {kpis.map((k) => (
        <div key={k.label} className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{k.icon}</div>
            <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">{k.trend}</span>
          </div>
          <p className="text-xl font-bold text-foreground">{k.val}</p>
          <p className="text-[11px] text-muted-foreground">{k.label}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileApprovals() {
  usePending();
  const all = pendingStore.list();
  const pending = all.filter((p) => p.status === "pending");
  const recent = all.filter((p) => p.status !== "pending").slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Pending signups</h3>
          <p className="text-[11px] text-muted-foreground">Approve riders and partners</p>
        </div>
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cta/10 text-cta text-[11px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-cta animate-pulse" />
            {pending.length} new
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl bg-card border border-border">
          No new signups awaiting approval.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((s) => <ApprovalCard key={s.id} signup={s} />)}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-foreground mt-6 mb-2">Recently reviewed</h3>
          <div className="flex flex-col gap-2">
            {recent.map((s) => (
              <div key={s.id} className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
                  {s.role === "rider" ? <Bike className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{s.role} · {s.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                  s.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                }`}>{s.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ApprovalCard({ signup }: { signup: PendingSignup }) {
  const isRider = signup.role === "rider";
  return (
    <div className="p-4 rounded-2xl bg-card border border-border">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isRider ? "bg-cta/10 text-cta" : "bg-primary/10 text-primary"}`}>
          {isRider ? <Bike className="h-5 w-5" /> : <Store className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{signup.firstName} {signup.lastName}</p>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-foreground">{signup.role}</span>
          </div>
          {signup.businessName && <p className="text-[12px] text-foreground font-medium mt-0.5 truncate">{signup.businessName}</p>}
          <div className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{signup.email}</span>
            {signup.businessPhone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{signup.businessPhone}</span>}
            {isRider && (
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-3 w-3" />License: {signup.hasLicense ? "Yes" : "No"} · Experienced: {signup.isExperienced ? "Yes" : "No"}</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => pendingStore.setStatus(signup.id, "rejected")}
          className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95">
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button onClick={() => pendingStore.setStatus(signup.id, "approved")}
          className="flex-1 h-10 rounded-xl bg-success text-success-foreground font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95">
          <CheckCircle2 className="h-4 w-4" /> Approve
        </button>
      </div>
    </div>
  );
}

/* ---------- OPERATIONS (records merged in) ---------- */

function RecordsScope({ tab, onSignOut }: { tab: "inbox" | "active"; onSignOut: () => void }) {
  void onSignOut;
  useOrders();
  if (tab === "active") return <RecordsActive />;
  return <RecordsInbox />;
}

function RecordsHome() {
  const pending = ordersStore.pending().length;
  const assigned = ordersStore.list().filter((o) => o.status === "assigned").length;
  const accepted = ordersStore.list().filter((o) => o.status === "accepted" || o.status === "in_transit").length;
  return (
    <div className="space-y-3">
      <KPI label="New orders" val={String(pending)} tone="cta" />
      <KPI label="Awaiting rider response" val={String(assigned)} tone="primary" />
      <KPI label="Riders en route" val={String(accepted)} tone="success" />
    </div>
  );
}

function RecordsInbox() {
  useOrders();
  const inbox = ordersStore.list().filter((o) => o.status === "pending" || o.status === "assigned");
  const riders = ridersStore.approved();
  const [picks, setPicks] = useState<Record<string, string>>({});

  const assign = (orderId: string) => {
    const rid = picks[orderId] ?? riders[0]?.id;
    const r = riders.find((x) => x.id === rid);
    if (!r) { toast.error("No approved rider"); return; }
    ordersStore.assignRider(orderId, r.id, r.name);
    toast.success(`Assigned to ${r.name}`);
  };

  return (
    <div>
      <h3 className="text-base font-bold text-foreground mb-3">New & assigned orders</h3>
      {inbox.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl bg-card border border-border">Inbox empty.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {inbox.map((o) => (
            <div key={o.id} className="p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{o.itemDescription}</p>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary text-foreground">{o.type}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{o.id} · {o.customerFirstName} {o.customerLastName} · {o.customerPhone}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Pickup: {o.pickup}</p>
              <p className="text-[11px] text-muted-foreground">Drop-off: {o.dropoff}</p>

              <div className="mt-3 flex gap-2">
                <select
                  value={picks[o.id] ?? o.assignedRiderId ?? riders[0]?.id ?? ""}
                  onChange={(e) => setPicks((p) => ({ ...p, [o.id]: e.target.value }))}
                  className="flex-1 h-10 px-3 rounded-xl bg-input border border-border text-sm"
                >
                  {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={() => assign(o.id)} className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-95">
                  {o.status === "assigned" ? "Reassign" : "Assign"}
                </button>
              </div>
              {o.status === "assigned" && (
                <p className="mt-2 text-[10px] text-cta font-bold">Awaiting rider acceptance · {o.assignedRiderName}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordsActive() {
  useOrders();
  const active = ordersStore.list().filter((o) => o.status === "accepted" || o.status === "in_transit");
  return (
    <div>
      <h3 className="text-base font-bold text-foreground mb-3">Active deliveries</h3>
      {active.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl bg-card border border-border">None active.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((o) => (
            <div key={o.id} className="p-3 rounded-2xl bg-card border border-border">
              <p className="text-sm font-semibold text-foreground truncate">{o.itemDescription}</p>
              <p className="text-[11px] text-muted-foreground">{o.id} · {o.assignedRiderName} · {o.status}</p>
              <div className="mt-2 flex gap-2">
                {o.status === "accepted" && (
                  <button onClick={() => ordersStore.advance(o.id, "in_transit")} className="px-3 h-8 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">Mark in transit</button>
                )}
                {o.status === "in_transit" && (
                  <button onClick={() => ordersStore.advance(o.id, "delivered")} className="px-3 h-8 rounded-lg bg-success text-success-foreground text-[11px] font-semibold">Mark delivered</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- LOGISTICS ---------- */

interface TeleEvent { id: number; ts: string; topic: string; payload: string; }

function LogisticsScope({ tab, onSignOut }: { tab: LogisticsTab; onSignOut: () => void }) {
  useOrders();
  if (tab === "inbox") return (
    <div className="space-y-6">
      <RecordsInbox />
      <RecordsActive />
    </div>
  );
  if (tab === "telemetry") return <LogisticsTelemetry />;
  if (tab === "catalog") return (
    <div className="space-y-4">
      <Link to="/admin-vendors" className="block p-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-3 active:scale-[0.99]">
        <Store className="h-5 w-5" /> Manage vendor stocks →
      </Link>
      <ProductCatalog />
    </div>
  );
  if (tab === "settings") return <SignOut onSignOut={onSignOut} />;
  const pending = ordersStore.pending().length;
  const inTransit = ordersStore.list().filter((o) => o.status === "in_transit" || o.status === "accepted").length;
  const delivered = ordersStore.list().filter((o) => o.status === "delivered").length;
  return (
    <div className="space-y-3">
      <KPI label="New orders" val={String(pending)} tone="cta" />
      <KPI label="Riders en route" val={String(inTransit)} tone="primary" />
      <KPI label="Delivered" val={String(delivered)} tone="success" />
    </div>
  );
}

function LogisticsTelemetry() {
  const [events, setEvents] = useState<TeleEvent[]>([]);
  const [coord, setCoord] = useState({ x: 30, y: 220 });
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n++;
      const topics = ["geo.update", "order.dispatched", "rider.heartbeat", "delivery.completed"];
      const t = topics[n % topics.length];
      const lat = (6.45 + Math.random() * 0.05).toFixed(5);
      const lng = (3.40 + Math.random() * 0.05).toFixed(5);
      setEvents((e) => [{ id: Date.now() + n, ts: new Date().toLocaleTimeString(), topic: t, payload: `rider=R${20 + (n % 8)} lat=${lat} lng=${lng}` }, ...e].slice(0, 30));
      setCoord((c) => ({ x: Math.min(370, c.x + 8 + Math.random() * 6), y: Math.max(40, c.y - 4 - Math.random() * 4) }));
    }, 1200);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <div className="relative h-56 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-secondary to-accent mb-3">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 224" preserveAspectRatio="none">
          <path d="M 30 220 Q 100 180 140 150 T 240 90 Q 300 60 370 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 5" className="text-primary" />
        </svg>
        <div className="absolute h-4 w-4 rounded-full bg-cta ring-4 ring-cta/30 transition-all duration-1000"
          style={{ left: `${(coord.x / 400) * 100}%`, top: `${(coord.y / 224) * 100}%`, transform: "translate(-50%, -50%)" }} />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-card/90 px-2 py-1 rounded-lg">
          <Activity className="h-3 w-3 text-success animate-pulse" />
          <span className="text-[10px] font-bold text-foreground">Kafka stream active</span>
        </div>
      </div>
      <h3 className="text-sm font-bold text-foreground mb-2">Event log</h3>
      <div className="rounded-2xl bg-card border border-border p-2 max-h-[320px] overflow-y-auto scrollbar-hide font-mono">
        {events.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Waiting for telemetry…</p>}
        {events.map((e) => (
          <div key={e.id} className="px-2 py-1.5 border-b border-border/50 last:border-0 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{e.ts}</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{e.topic}</span>
            </div>
            <p className="text-foreground mt-0.5 truncate">{e.payload}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogisticsRoutes() {
  const routes = [
    { id: "RTE-A12", name: "Lagos → Ibadan", load: 84 },
    { id: "RTE-B07", name: "Lekki → Yaba", load: 62 },
    { id: "RTE-C03", name: "Apapa → VI", load: 41 },
  ];
  return (
    <div className="flex flex-col gap-2">
      {routes.map((r) => (
        <div key={r.id} className="p-3 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{r.name}</p>
            <span className="text-[10px] text-muted-foreground">{r.id}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${r.load}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Load {r.load}%</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- PRODUCT (merged into Logistics) ---------- */

interface AdminProduct { id: string; name: string; price: number; cat: string; }

function VendorsRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/admin-vendors" }); }, [navigate]);
  return (
    <div className="text-center py-10 text-sm text-muted-foreground">Opening vendors…</div>
  );
}

function ProductCatalog() {
  const [items, setItems] = useState<AdminProduct[]>([
    { id: "p1", name: "Pro Stand Mixer", price: 549, cat: "Appliances" },
    { id: "p2", name: "Leather Tote", price: 320, cat: "Bags" },
    { id: "p3", name: "4K Smart TV 55\"", price: 899, cat: "Electronics" },
  ]);
  return (
    <div className="flex flex-col gap-2">
      {items.map((p) => (
        <div key={p.id} className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center"><Package className="h-4 w-4" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
            <p className="text-[11px] text-muted-foreground">{p.cat} · ${p.price}</p>
          </div>
          <button className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center"><Edit3 className="h-3.5 w-3.5" /></button>
          <button onClick={() => setItems((i) => i.filter((x) => x.id !== p.id))} className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- shared bits ---------- */

function KPI({ label, val, tone }: { label: string; val: string; tone: "cta" | "primary" | "success" }) {
  const tones = {
    cta: "bg-cta/10 text-cta",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <BarChart3 className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{val}</p>
      </div>
    </div>
  );
}

function SignOut({ onSignOut }: { onSignOut: () => void }) {
  const user = auth.current();
  return (
    <div>
      <ProfileHeader user={user} />
      <button onClick={onSignOut} className="w-full p-4 rounded-2xl bg-destructive/10 text-destructive flex items-center gap-3 active:scale-[0.99] font-semibold text-sm">
        <LogOut className="h-5 w-5" /> Sign out
      </button>
    </div>
  );
}
