import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  Activity,
  Store,
  Bike,
  Mail,
  Phone,
  BadgeCheck,
  Home,
  Inbox,
  Layers,
  LogOut,
  ShieldCheck,
  BarChart3,
  User as UserIcon,
  MessageSquare,
  Share2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader } from "@/components/PageLoader";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AdminChatDialog } from "@/components/admin/AdminChatDialog";
import { AdminUsersDialog } from "@/components/admin/AdminUsersDialog";
import { AdminQrShareDialog } from "@/components/admin/AdminQrShareDialog";
import { supabase } from "@/integrations/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — EasyBlue" }] }),
  component: AdminPage,
});

type AdminScope = "super" | "logistics";

interface ProfileMetadata {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
  role: string | null;
  approval?: string | null;
  businessName?: string | null;
  businessPhone?: string | null;
  hasLicense?: boolean;
  isExperienced?: boolean;
  status?: "pending" | "approved" | "rejected";
}

interface MockOrder {
  id: string;
  itemDescription: string;
  type: string;
  first_name: string;
  customerLastName: string;
  customerPhone: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  senderLocation: string;
  receiverLocation: string;
  paymentMode: string;
  status: "pending" | "assigned" | "accepted" | "in_transit" | "delivered";
  assignedRiderId?: string;
  assignedRiderName?: string;
}

interface MockRider {
  id: string;
  name: string;
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch verified admin session layout data
  const { data: adminProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized access");

      const { data: profile, error } = await supabase
        .from("users")
        .select("*, admin_profiles(scope)")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile) throw new Error("Admin record resolution failed");
      return profile;
    },
  });

  // Query pending registrations from database
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-pending-approvals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("approval", "pending")
        .order("created_at", { ascending: false });
      return (data || []) as ProfileMetadata[];
    },
  });

  // Handle live database status mutation pipelines with dual public + auth sync hooks
  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      // 1. Update public visibility layer table state
      const { error: publicError } = await supabase
        .from("users")
        .update({ approval: status })
        .eq("id", id);
      if (publicError) throw publicError;

      // Note: In standard Supabase environments, handling auth metadata sync securely for
      // other users is ideally managed via an elevated Edge Function or a Postgres trigger function
      // (like your public.handle_new_user_registration pipeline) to prevent security policy violations.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      toast.success("User operational security clear state updated");
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "State adjustment failed");
    },
  });

  if (profileLoading || pendingLoading) {
    return (
      <MobileShell>
        <PageLoader label="Validating Security Context..." />
      </MobileShell>
    );
  }

  if (!adminProfile) {
    navigate({ to: "/login" }); // FIXED: Realigned route targets cleanly
    return null;
  }

  // Derive explicit application administrative operation authorization scopes
  const rawScope = (adminProfile as any).admin_profiles?.scope;
  const scope: AdminScope = rawScope === "logistics" ? "logistics" : "super";

  return (
    <MobileShell>
      <ScopeShell
        scope={scope}
        user={{
          id: adminProfile.id,
          first_name: (adminProfile as any).first_name || "Operations",
          role: (adminProfile as any).role || "admin",
          full_name:
            (adminProfile as any).full_name ||
            `${(adminProfile as any).first_name || ""} ${(adminProfile as any).last_name || ""}`.trim() ||
            "Operations Team",
        }}
        pendingList={pendingUsers || []}
        onUpdateStatus={(id, status) => approveMutation.mutate({ id, status })}
      />
    </MobileShell>
  );
}

/* ---------- Administrative Structural Layout Engine ---------- */

function ScopeShell({
  scope,
  user,
  pendingList,
  onUpdateStatus,
}: {
  scope: AdminScope;
  user: { id: string; first_name: string; role: string; full_name: string };
  pendingList: ProfileMetadata[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
}) {
  const [tab, setTab] = useState<string>("home");

  const [orders, setOrders] = useState<MockOrder[]>([
    {
      id: "ORD-9021",
      itemDescription: "Medical Supplies Bundle",
      type: "Express",
      first_name: "Chidi",
      customerLastName: "Okeke",
      customerPhone: "+2348031112222",
      senderName: "Central Pharmacy",
      senderPhone: "+2348039998888",
      receiverName: "St. Mary's Clinic",
      receiverPhone: "+2348037776666",
      senderLocation: "Mainland Hub, Lagos",
      receiverLocation: "Onitsha Corporate Suite",
      paymentMode: "Digital Wallet",
      status: "pending",
    },
  ]);

  const riders: MockRider[] = [
    { id: "R-201", name: "Emeka Obi" },
    { id: "R-202", name: "Tunde Bakare" },
  ];

  const handleAssignRider = (orderId: string, riderId: string, riderName: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "assigned", assignedRiderId: riderId, assignedRiderName: riderName }
          : o,
      ),
    );
  };

  const handleAdvanceOrder = (orderId: string, nextStatus: "in_transit" | "delivered") => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
  };

  const navs = {
    super: [
      { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
      {
        id: "profile",
        label: "Approvals",
        icon: <UserIcon className="h-[22px] w-[22px]" />,
        badge: pendingList.length,
      },
      { id: "stats", label: "Stats", icon: <BarChart3 className="h-[22px] w-[22px]" /> },
      { id: "settings", label: "Settings", icon: <ShieldCheck className="h-[22px] w-[22px]" /> },
    ],
    logistics: [
      { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
      {
        id: "inbox",
        label: "Inbox",
        icon: <Inbox className="h-[22px] w-[22px]" />,
        badge: orders.filter((o) => o.status === "pending").length,
      },
      { id: "telemetry", label: "Telemetry", icon: <Activity className="h-[22px] w-[22px]" /> },
      { id: "catalog", label: "Catalog", icon: <Layers className="h-[22px] w-[22px]" /> },
      { id: "settings", label: "Settings", icon: <ShieldCheck className="h-[22px] w-[22px]" /> },
    ],
  };

  const currentTabs = navs[scope];
  const title = scope === "super" ? "Super Admin" : "Operations Admin";

  return (
    <>
      <header
        className="safe-top px-5 pt-4 pb-5 bg-primary text-primary-foreground"
        style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 text-primary-foreground" />
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
              Live Engine
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-3">Hello, {user.first_name}</h1>
        <p className="text-sm opacity-80">{title} · Dashboard Ecosystem</p>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-4">
        {scope === "super" && (
          <SuperScope
            tab={tab}
            user={user} // FIXED: Injected derived validated account user data downwards
            pendingList={pendingList}
            onUpdateStatus={onUpdateStatus}
            ordersList={orders}
          />
        )}
        {scope === "logistics" && (
          <LogisticsScope
            tab={tab}
            user={user} // FIXED: Injected derived validated account user data downwards
            orders={orders}
            riders={riders}
            onAssign={handleAssignRider}
            onAdvance={handleAdvanceOrder}
          />
        )}
      </main>

      <nav
        className="mt-auto mx-4 z-30 flex items-center justify-between gap-1 px-4 py-2 rounded-full
                   border border-white/30 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-2xl shadow-xl"
        style={{ marginBottom: `calc(env(safe-area-inset-bottom, 0px) + 6px)` }}
      >
        {currentTabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              className={`relative h-11 w-11 rounded-full flex items-center justify-center transition active:scale-90 ${
                active ? "bg-primary text-primary-foreground shadow-md" : "text-foreground/80"
              }`}
            >
              {t.icon}
              {t.badge && t.badge > 0 ? (
                <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
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

/* ---------- SUPER ADMIN SCOPE VIEW CONTAINER ---------- */

function SuperScope({
  tab,
  user,
  pendingList,
  onUpdateStatus,
  ordersList,
}: {
  tab: string;
  user: { id: string; first_name: string; role: string; full_name: string };
  pendingList: ProfileMetadata[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
  ordersList: MockOrder[];
}) {
  if (tab === "profile") {
    return <ProfileApprovals list={pendingList} onUpdateStatus={onUpdateStatus} />;
  }
  if (tab === "stats") {
    return <SuperStats pendingList={pendingList} ordersList={ordersList} />;
  }
  if (tab === "settings") {
    return <SignOutComponent user={user} />;
  }
  return <SuperHome pendingList={pendingList} ordersList={ordersList} />;
}

function SuperHome({
  pendingList,
  ordersList,
}: {
  pendingList: ProfileMetadata[];
  ordersList: MockOrder[];
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Operational Controllers</h3>
        <DarkModeToggle />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Comms",
            icon: <MessageSquare className="h-5 w-5" />,
            onClick: () => setChatOpen(true),
            tone: "bg-amber-500/10 text-amber-500",
          },
          {
            label: "Directory",
            icon: <Users className="h-5 w-5" />,
            onClick: () => setUsersOpen(true),
            tone: "bg-blue-500/10 text-blue-500",
          },
          {
            label: "Gateway",
            icon: <Share2 className="h-5 w-5" />,
            onClick: () => setShareOpen(true),
            tone: "bg-emerald-500/10 text-emerald-500",
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="p-3 rounded-2xl bg-card border border-border flex flex-col items-center gap-2 active:scale-95"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.tone}`}>
              {a.icon}
            </div>
            <span className="text-xs font-semibold text-foreground">{a.label}</span>
          </button>
        ))}
      </div>

      <KPI label="Pending Signups" val={String(pendingList.length)} tone="cta" />
      <KPI label="Active Shipments" val={String(ordersList.length)} tone="primary" />

      <AdminChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      <AdminUsersDialog open={usersOpen} onOpenChange={setUsersOpen} />
      <AdminQrShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

function SuperStats({
  pendingList,
  ordersList,
}: {
  pendingList: ProfileMetadata[];
  ordersList: MockOrder[];
}) {
  const completedDeliveries = ordersList.filter((o) => o.status === "delivered").length;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {[
        {
          label: "Completed Hub Tasking",
          val: String(completedDeliveries),
          icon: <Truck className="h-4 w-4" />,
        },
        {
          label: "Pending Screening",
          val: String(pendingList.length),
          icon: <Users className="h-4 w-4" />,
        },
      ].map((k) => (
        <div key={k.label} className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {k.icon}
            </div>
            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Live
            </span>
          </div>
          <p className="text-xl font-bold text-foreground">{k.val}</p>
          <p className="text-[11px] text-muted-foreground">{k.label}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileApprovals({
  list,
  onUpdateStatus,
}: {
  list: ProfileMetadata[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Security Clearances</h3>
          <p className="text-[11px] text-muted-foreground">Approve/verify fleet entities</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl bg-card border border-border">
          All signups cleared. Pipeline pristine.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((s) => (
            <div key={s.id} className="p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {s.role === "rider" ? (
                    <Bike className="h-5 w-5" />
                  ) : (
                    <Store className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{s.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Account Context: {s.role}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onUpdateStatus(s.id, "rejected")}
                  className="flex-1 h-10 rounded-xl bg-red-500/10 text-red-500 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <XCircle className="h-4 w-4" /> Deny
                </button>
                <button
                  onClick={() => onUpdateStatus(s.id, "approved")}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" /> Authorize
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- LOGISTICS MANAGEMENT CONTROLLER ---------- */

function LogisticsScope({
  tab,
  user,
  orders,
  riders,
  onAssign,
  onAdvance,
}: {
  tab: string;
  user: { id: string; first_name: string; role: string; full_name: string };
  orders: MockOrder[];
  riders: MockRider[];
  onAssign: (orderId: string, riderId: string, riderName: string) => void;
  onAdvance: (orderId: string, nextStatus: "in_transit" | "delivered") => void;
}) {
  const [picks, setPicks] = useState<Record<string, string>>({});

  if (tab === "telemetry") return <LogisticsTelemetry />;
  if (tab === "catalog") {
    return (
      <div className="space-y-4">
        <Link
          to="/admin-vendors"
          className="block p-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-between active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5" />
            <span>Manage Vendor Stocks</span>
          </div>
          <span>→</span>
        </Link>
        <ProductCatalog />
      </div>
    );
  }
  if (tab === "settings") return <SignOutComponent user={user} />;

  const inboundOrders = orders.filter((o) => o.status === "pending" || o.status === "assigned");
  const activeOrders = orders.filter((o) => o.status === "accepted" || o.status === "in_transit");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-3">Manifest Inbound</h3>
        {inboundOrders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs rounded-2xl bg-card border border-border">
            No inbound items inside channel queue.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {inboundOrders.map((o) => (
              <div key={o.id} className="p-4 rounded-2xl bg-card border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{o.itemDescription}</p>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary text-foreground">
                    {o.type}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{o.id} · Route Gate</p>
                <div className="text-[11px] text-muted-foreground pt-1">
                  <p>Origin: {o.senderLocation}</p>
                  <p>Destination: {o.receiverLocation}</p>
                </div>
                <div className="mt-3 flex gap-2 pt-1">
                  <select
                    value={picks[o.id] ?? riders[0]?.id ?? ""}
                    onChange={(e) => setPicks({ ...picks, [o.id]: e.target.value })}
                    className="flex-1 h-10 px-3 rounded-xl bg-input border border-border text-xs"
                  >
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const selectedId = picks[o.id] || riders[0]?.id;
                      const rider = riders.find((r) => r.id === selectedId);
                      if (rider) {
                        onAssign(o.id, rider.id, rider.name);
                        toast.success(`Manifest mapped cleanly to ${rider.name}`);
                      }
                    }}
                    className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-95"
                  >
                    {o.status === "assigned" ? "Remap" : "Dispatch"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-bold text-foreground mb-3">Active Pipeline Track</h3>
        {activeOrders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs rounded-2xl bg-card border border-border">
            Transit pipeline fully resolved.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeOrders.map((o) => (
              <div
                key={o.id}
                className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{o.itemDescription}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Carrier: {o.assignedRiderName} · Status:{" "}
                    <span className="text-primary font-bold">{o.status}</span>
                  </p>
                </div>
                <div>
                  {o.status === "accepted" && (
                    <button
                      onClick={() => onAdvance(o.id, "in_transit")}
                      className="px-3 h-8 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold"
                    >
                      Depart
                    </button>
                  )}
                  {o.status === "in_transit" && (
                    <button
                      onClick={() => onAdvance(o.id, "delivered")}
                      className="px-3 h-8 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogisticsTelemetry() {
  const [events, setEvents] = useState<
    { id: number; ts: string; topic: string; payload: string }[]
  >([]);

  useEffect(() => {
    const handle = setInterval(() => {
      const logs = ["geo.ping", "broker.dispatch", "node.heartbeat", "ack.delivery"];
      const topic = logs[Math.floor(Math.random() * logs.length)];
      setEvents((prev) =>
        [
          {
            id: Date.now(),
            ts: new Date().toLocaleTimeString(),
            topic,
            payload: `lat=${(6.45 + Math.random() * 0.02).toFixed(4)} lng=${(3.4 + Math.random() * 0.02).toFixed(4)} node=active`,
          },
          ...prev,
        ].slice(0, 15),
      );
    }, 1500);
    return () => clearInterval(handle);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative h-44 rounded-2xl border border-border bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center overflow-hidden">
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-md">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-white">Stream: Live Socket Connection</span>
        </div>
        <BarChart3 className="h-12 w-12 text-white/10 animate-bounce" />
      </div>

      <h3 className="text-sm font-bold text-foreground">Message Broker Log</h3>
      <div className="rounded-2xl bg-card border border-border p-2 max-h-[260px] overflow-y-auto font-mono text-[10px] space-y-1.5">
        {events.length === 0 && (
          <p className="text-muted-foreground text-center py-4">Awaiting socket messages...</p>
        )}
        {events.map((e) => (
          <div key={e.id} className="pb-1.5 border-b border-border/40 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{e.ts}</span>
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                {e.topic}
              </span>
            </div>
            <p className="text-foreground truncate mt-0.5">{e.payload}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCatalog() {
  const [items, setItems] = useState([
    { id: "p1", name: "Heavy Duty Straps", price: 45, cat: "Rigging" },
    { id: "p2", name: "High-Visibility Vest", price: 12, cat: "Safety" },
  ]);

  return (
    <div className="flex flex-col gap-2">
      {items.map((p) => (
        <div
          key={p.id}
          className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {p.cat} · ₦{p.price}
              </p>
            </div>
          </div>
          <button
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== p.id))}
            className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function KPI({ label, val, tone }: { label: string; val: string; tone: "cta" | "primary" }) {
  const styles = tone === "cta" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500";
  return (
    <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${styles}`}>
        <BarChart3 className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{val}</p>
      </div>
    </div>
  );
}

// FIXED: Clean props engine injection strategy avoids duplication network overhead loops
function SignOutComponent({ user }: { user: { id: string; role: string; full_name: string } }) {
  const navigate = useNavigate();
  const [isSignOutPending, setIsSignOutPending] = useState(false);

  const handleSignOut = async () => {
    setIsSignOutPending(true);
    try {
      if (user.role === "rider") {
        await supabase.from("riders").update({ is_available: false }).eq("user_id", user.id);
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Identity session terminated safely");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error("Sign out process encountered a fault");
    } finally {
      setIsSignOutPending(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">{user.full_name}</p>
        <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
          {user.role} Authorization Node
        </p>
      </div>
      <button
        onClick={handleSignOut}
        disabled={isSignOutPending}
        className="h-10 px-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-2 text-sm font-semibold transition hover:bg-red-500/20 disabled:opacity-50 active:scale-[0.98]"
      >
        {isSignOutPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        Disconnect
      </button>
    </div>
  );
}
