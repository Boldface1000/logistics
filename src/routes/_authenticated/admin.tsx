/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Users,
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  Trash2,
  Activity,
  Store,
  Bike,
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

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — EasyBlue" }] }),
  component: AdminPage,
});

type AdminScope = "super" | "logistics";
interface PendingUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  approval: string;
  created_at: string;
  // Joined from vendors (only present when role === 'vendor')
  vendors: {
    registered_business_name: string;
    business_phone: string;
  } | null;
  // Joined from riders (only present when role === 'rider')
  riders: {
    nin: string | null;
    nin_photo_url: string | null;
    has_license: boolean;
    is_experienced: boolean;
    vehicle_type: string | null;
  } | null;
}

interface RealOrder {
  type: ReactNode;
  id: string;
  item_description: string;
  order_type: string | null;
  status:
    | "pending"
    | "assigned"
    | "accepted"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  sender_name: string | null;
  sender_phone: string | null;
  sender_location: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_location: string | null;
  payment_mode: string;
  assigned_rider_id: string | null;
  // joined
  rider: {
    id: string;
    user_id: string;
    users: { first_name: string; last_name: string } | null;
  } | null;
  customer: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}
interface RealRider {
  id: string;
  user_id: string;
  users: { first_name: string; last_name: string } | null;
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
  const { data: pendingUsers = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
        id,
        email,
        first_name,
        last_name,
        role,
        approval,
        created_at,
        vendors!vendors_user_id_fkey (
          registered_business_name,
          business_phone
        ),
        riders!riders_user_id_fkey (
          nin,
          nin_photo_url,
          has_license,
          is_experienced,
          vehicle_type
        )
      `,
        )
        .eq("approval", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PendingUser[];
    },
  });

  // Handle live database status mutation pipelines with dual public + auth sync hooks
  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error: publicError } = await supabase
        .from("users")
        .update({ approval: status })
        .eq("id", id);
      if (publicError) throw publicError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      toast.success("User operational security clear state updated");
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "State adjustment failed");
    },
  });

  // Fetch active orders (pending + assigned + accepted + in_transit)
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
        id,
        item_description,
        status,
        sender_name,
        sender_phone,
        sender_location,
        receiver_name,
        receiver_phone,
        receiver_location,
        payment_mode,
        assigned_rider_id,
        rider:riders!orders_assigned_rider_id_fkey (
          id,
          user_id,
          users!riders_user_id_fkey (
            first_name,
            last_name
          )
        ),
        customer:users!orders_customer_id_fkey (
          first_name,
          last_name,
          phone
        )
      `,
        )
        .in("status", ["pending", "assigned", "accepted", "in_transit"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as RealOrder[];
    },
  });

  // Fetch approved available riders for dispatch dropdown
  const { data: riders = [] } = useQuery({
    queryKey: ["admin-available-riders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riders")
        .select(
          `
        id,
        user_id,
        users!riders_user_id_fkey (
          first_name,
          last_name
        )
      `,
        )
        .eq("approval", "approved")
        .eq("is_available", true);

      if (error) throw error;
      return (data ?? []) as RealRider[];
    },
  });

  // Assign a rider to an order
  const assignRiderMutation = useMutation({
    mutationFn: async ({ orderId, riderId }: { orderId: string; riderId: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ assigned_rider_id: riderId, status: "assigned" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Rider dispatched successfully");
    },
    onError: (err: any) => toast.error(err.message ?? "Dispatch failed"),
  });

  // Advance order status
  const advanceOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      nextStatus,
    }: {
      orderId: string;
      nextStatus: "in_transit" | "delivered";
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated");
    },
    onError: (err: any) => toast.error(err.message ?? "Status update failed"),
  });

  // Update the loading guard to include ordersLoading
  if (profileLoading || pendingLoading || ordersLoading) {
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
        pendingList={pendingUsers}
        orders={orders}
        riders={riders}
        onUpdateStatus={(id, status) => approveMutation.mutate({ id, status })}
        onAssignRider={(orderId, riderId) => assignRiderMutation.mutate({ orderId, riderId })}
        onAdvanceOrder={(orderId, nextStatus) =>
          advanceOrderMutation.mutate({ orderId, nextStatus })
        }
      />
    </MobileShell>
  );
}

/* ---------- Administrative Structural Layout Engine ---------- */

function ScopeShell({
  scope,
  user,
  pendingList,
  orders,
  riders,
  onUpdateStatus,
  onAssignRider,
  onAdvanceOrder,
}: {
  scope: AdminScope;
  user: { id: string; first_name: string; role: string; full_name: string };
  pendingList: PendingUser[];
  orders: RealOrder[];
  riders: RealRider[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
  onAssignRider: (orderId: string, riderId: string) => void;
  onAdvanceOrder: (orderId: string, nextStatus: "in_transit" | "delivered") => void;
}) {
  const [tab, setTab] = useState<string>("home");

  const navs = {
    super: [
      { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
      {
        id: "users",
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
            onAssign={onAssignRider}
            onAdvance={onAdvanceOrder}
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
  pendingList: PendingUser[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
  ordersList: RealOrder[];
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
  pendingList: PendingUser[];
  ordersList: RealOrder[];
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
  pendingList: PendingUser[];
  ordersList: RealOrder[]; // ← was MockOrder[]
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
  list: PendingUser[];
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
            <div key={s.id} className="p-4 rounded-2xl bg-card border border-border space-y-3">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {s.role === "rider" ? (
                    <Bike className="h-5 w-5" />
                  ) : (
                    <Store className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {s.first_name} {s.last_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                  <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                    Account Context: {s.role}
                  </p>
                </div>
              </div>

              {/* Vendor detail block */}
              {s.role === "vendor" && s.vendors && (
                <div className="rounded-xl bg-muted/40 border border-border px-3 py-2 space-y-0.5">
                  <p className="text-[11px] font-semibold text-foreground">
                    {s.vendors.registered_business_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.vendors.business_phone}</p>
                </div>
              )}

              {/* Rider detail block */}
              {s.role === "rider" && s.riders && (
                <div className="rounded-xl bg-muted/40 border border-border px-3 py-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span>NIN: {s.riders.nin ?? "—"}</span>
                    <span>License: {s.riders.has_license ? "Yes" : "No"}</span>
                    <span>Experienced: {s.riders.is_experienced ? "Yes" : "No"}</span>
                    <span>Vehicle: {s.riders.vehicle_type ?? "—"}</span>
                  </div>

                  {s.riders.nin_photo_url && (
                    <a
                      href={s.riders.nin_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary underline-offset-2 hover:underline inline-block mt-1"
                    >
                      View NIN Photo
                    </a>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
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
  orders: RealOrder[];
  riders: RealRider[];
  onAssign: (orderId: string, riderId: string) => void;
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
                  <p className="text-sm font-bold text-foreground">{o.item_description}</p>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary text-foreground">
                    {o.type}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{o.id} · Route Gate</p>
                <div className="text-[11px] text-muted-foreground pt-1">
                  <p>Origin: {o.sender_location}</p>
                  <p>Destination: {o.receiver_location}</p>
                </div>
                <div className="mt-3 flex gap-2 pt-1">
                  <select
                    value={picks[o.id] ?? riders[0]?.id ?? ""}
                    onChange={(e) => setPicks({ ...picks, [o.id]: e.target.value })}
                    className="flex-1 h-10 px-3 rounded-xl bg-input border border-border text-xs"
                  >
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.users?.first_name} {r.users?.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const selectedId = picks[o.id] || riders[0]?.id;
                      if (selectedId) {
                        onAssign(o.id, selectedId);
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
                  <p className="text-sm font-semibold text-foreground">{o.item_description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Carrier: {o.rider?.users?.first_name} {o.rider?.users?.last_name} · Status:{" "}
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
    {
      id: number;
      ts: string;
      shipment_id: string;
      lat: string;
      lng: string;
      speed_kph: string | null;
    }[]
  >([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 1. Load the last 15 events on mount
    supabase
      .from("telemetry_events")
      .select("id, shipment_id, lat, lng, speed_kph, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (data) {
          setEvents(
            data.map((e) => ({
              id: e.id,
              ts: new Date(e.recorded_at).toLocaleTimeString(),
              shipment_id: e.shipment_id,
              lat: String(e.lat),
              lng: String(e.lng),
              speed_kph: e.speed_kph ? String(e.speed_kph) : null,
            })),
          );
        }
      });

    // 2. Subscribe to new inserts in real time
    const channel = supabase
      .channel("telemetry-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry_events" },
        (payload) => {
          const e = payload.new as {
            id: number;
            shipment_id: string;
            lat: number;
            lng: number;
            speed_kph: number | null;
            recorded_at: string;
          };
          setEvents((prev: any) =>
            [
              {
                id: e.id,
                ts: new Date(e.recorded_at).toLocaleTimeString(),
                shipment_id: e.shipment_id,
                lat: String(e.lat),
                lng: String(e.lng),
                speed_kph: e.speed_kph ? String(e.speed_kph) : null,
              },
              ...prev,
            ].slice(0, 15),
          );
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative h-44 rounded-2xl border border-border bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center overflow-hidden">
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-md">
          <Activity
            className={`h-3 w-3 ${connected ? "text-emerald-400 animate-pulse" : "text-red-400"}`}
          />
          <span className="text-[10px] font-mono text-white">
            {connected ? "Stream: Live Socket Connection" : "Stream: Connecting..."}
          </span>
        </div>
        {events[0] && (
          <div className="text-center">
            <p className="text-white/60 text-[10px] font-mono">Last ping</p>
            <p className="text-white font-mono text-sm font-bold">
              {events[0].lat}, {events[0].lng}
            </p>
            {events[0].speed_kph && (
              <p className="text-emerald-400 text-[10px] font-mono mt-1">
                {events[0].speed_kph} km/h
              </p>
            )}
          </div>
        )}
        {!events[0] && <BarChart3 className="h-12 w-12 text-white/10" />}
      </div>

      <h3 className="text-sm font-bold text-foreground">Telemetry Event Log</h3>
      <div className="rounded-2xl bg-card border border-border p-2 max-h-[260px] overflow-y-auto font-mono text-[10px] space-y-1.5">
        {events.length === 0 && (
          <p className="text-muted-foreground text-center py-4">Awaiting telemetry events...</p>
        )}
        {events.map(
          (e: {
            id: Key | null | undefined;
            ts:
              | string
              | number
              | bigint
              | boolean
              | ReactElement<unknown, string | JSXElementConstructor<any>>
              | Iterable<ReactNode>
              | ReactPortal
              | Promise<
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactPortal
                  | ReactElement<unknown, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | null
                  | undefined
                >
              | null
              | undefined;
            lat:
              | string
              | number
              | bigint
              | boolean
              | ReactElement<unknown, string | JSXElementConstructor<any>>
              | Iterable<ReactNode>
              | ReactPortal
              | Promise<
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactPortal
                  | ReactElement<unknown, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | null
                  | undefined
                >
              | null
              | undefined;
            lng:
              | string
              | number
              | bigint
              | boolean
              | ReactElement<unknown, string | JSXElementConstructor<any>>
              | Iterable<ReactNode>
              | ReactPortal
              | Promise<
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactPortal
                  | ReactElement<unknown, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | null
                  | undefined
                >
              | null
              | undefined;
            speed_kph: any;
            shipment_id: string | any[];
          }) => (
            <div key={e.id} className="pb-1.5 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{e.ts}</span>
                <span className="px-1.5 rounded bg-primary/10 text-primary font-bold">
                  geo.ping
                </span>
              </div>
              <p className="text-foreground truncate mt-0.5">
                lat={e.lat} lng={e.lng}
                {e.speed_kph ? ` speed=${e.speed_kph}kph` : ""} shipment=
                {e.shipment_id.slice(0, 8)}...
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ProductCatalog() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-product-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          description,
          image_url,
          price_cents,
          stock,
          is_active,
          vendor:vendors!products_vendor_id_fkey (
            registered_business_name
          )
        `,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-catalog"] });
      toast.success("Product removed from catalog");
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to remove product"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm rounded-2xl bg-card border border-dashed border-border">
        No active products in catalog.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {products.map((p) => (
        <div
          key={p.id}
          className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                className="h-9 w-9 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(p.vendor as any)?.registered_business_name ?? "—"} · ₦
                {((p.price_cents ?? 0) / 100).toLocaleString()} · Stock: {p.stock}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm(`Remove "${p.name}" from catalog?`)) {
                deactivateMutation.mutate(p.id);
              }
            }}
            disabled={deactivateMutation.isPending}
            className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90 disabled:opacity-50"
          >
            {deactivateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
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
