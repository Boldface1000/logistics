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
  MapPin,
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
  LucideAlignHorizontalDistributeCenter,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader } from "@/components/PageLoader";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { InstallAppBanner } from "@/components/InstallAppBanner";
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
  id: string;
  item_description: string;
  park_name: string | null;
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
  order_items: {
    id: string;
    quantity: number;
    product: {
      name: string;
      vendor: { registered_business_name: string } | null;
    } | null;
  }[];
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
    // 1. Always update users.approval
    const { error: userErr } = await supabase
      .from("users")
      .update({ approval: status })
      .eq("id", id);
    if (userErr) throw userErr;

    // 2. Fetch this user's role so we know which subsidiary table to sync
    const { data: user, error: roleErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", id)
      .single();
    if (roleErr) throw roleErr;

    // 3. Mirror approval into riders or vendors table
    if (user.role === "rider") {
      const { error } = await supabase
        .from("riders")
        .update({ approval: status })
        .eq("user_id", id);
      if (error) throw error;
    } else if (user.role === "vendor") {
      const { error } = await supabase
        .from("vendors")
        .update({ approval: status })
        .eq("user_id", id);
      if (error) throw error;
    }
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      toast.success("User operational security clear state updated");
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "State adjustment failed");
    },
  });

  const { data: userCounts }= useQuery({
    queryKey: ["admin-user-role-counts"],
    queryFn: async () => {
      const [{ count:customers }, { count: vendors }, { count: riders }] = await Promise.all([
        supabase.from("users").select("*", {count: "exact", head: true}).eq("role", "customer"),
        supabase.from("users").select("*", {count: "exact", head: true}).eq("role", "vendor"),
        supabase.from("users").select("*", {count: "exact", head: true}).eq("role", "rider"),
      ]);
      return { customers: customers ?? 0, vendors: vendors ?? 0, riders: riders ?? 0};
    },
  });

  const { data: totalOrdersCount = 0 } = useQuery({
    queryKey: ["admin-total-orders-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("orders").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Fetch all orders with relations for admin operations
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          item_description,
          park_name,
          status,
          sender_name,
          sender_phone,
          sender_location,
          receiver_name,
          receiver_phone,
          receiver_location,
          payment_mode,
          assigned_rider_id,
          created_at,
          customer:customer_id (
            id,
            first_name,
            last_name,
            phone
          ),
          rider:assigned_rider_id (
            id,
            user_id,
            users:users!riders_user_id_fkey (
              first_name,
              last_name
            )
          ),
          order_items (
            id,
            quantity,
            product:product_id (
              name,
              vendor:vendor_id (
                id,
                registered_business_name
              )
            )
          )
        `)
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
  const rawScope = Array.isArray(adminProfile.admin_profiles) ? (adminProfile as any).admin_profiles[0]?.scope : (adminProfile as any).admin_profiles?.scope;
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
        userCounts={userCounts}
        totalOrdersCount={totalOrdersCount}
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
  userCounts,
  totalOrdersCount,
}: {
  scope: AdminScope;
  user: { id: string; first_name: string; role: string; full_name: string };
  pendingList: PendingUser[];
  orders: RealOrder[];
  riders: RealRider[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
  onAssignRider: (orderId: string, riderId: string) => void;
  onAdvanceOrder: (orderId: string, nextStatus: "in_transit" | "delivered") => void;
  userCounts?: { customers: number; vendors: number; riders: number };
  totalOrdersCount?: number;
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
        id: "users",
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
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold mt-3">Hello, {user.first_name}</h1>
            <p className="text-sm opacity-80">{title} ·Administrative Ecosystem</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
              Live Engine
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-4">
        {scope === "super" && (
          <SuperScope
            tab={tab}
            user={user}
            pendingList={pendingList}
            onUpdateStatus={onUpdateStatus}
            ordersList={orders}
            userCounts={userCounts}
            totalOrdersCount={totalOrdersCount}
          />
        )}
        {scope === "logistics" && (
          <LogisticsScope
            tab={tab}
            user={user}
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
  userCounts,
  totalOrdersCount,
}: {
  tab: string;
  user: { id: string; first_name: string; role: string; full_name: string };
  pendingList: PendingUser[];
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
  ordersList: RealOrder[];
  userCounts?: {customers: number; vendors: number; riders: number};
  totalOrdersCount?: number;
}) {
  if (tab === "users") {
    return <ProfileApprovals list={pendingList} onUpdateStatus={onUpdateStatus} />;
  }
  if (tab === "stats") {
    return <SuperStats pendingList={pendingList} ordersList={ordersList} />;
  }
  if (tab === "settings") {
    return <SignOutComponent user={user} />;
  }
  return <SuperHome pendingList={pendingList} ordersList={ordersList} userCounts={userCounts} totalOrdersCount={totalOrdersCount} />;
}

function SuperHome({ pendingList, ordersList, userCounts, totalOrdersCount }: {
  pendingList: PendingUser[];
  ordersList: RealOrder[];
  userCounts?: {customers: number; vendors: number; riders: number};
  totalOrdersCount?: number;

}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["admin-unread-messages"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_is_admin", false)
        .is("read_at", null);
      return count ?? 0;
    },
  });
  
  return (
      <div className="space-y-3">
      ...
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Live Chat",
            icon: <MessageSquare className="h-5 w-5" />,
            onClick: () => setChatOpen(true),
            tone: "bg-amber-500/10 text-amber-500",
            badge: unreadCount,
          },
          {
            label: "Directory",
            icon: <Users className="h-5 w-5" />,
            onClick: () => setUsersOpen(true),
            tone: "bg-blue-500/10 text-blue-500",
            badge: 0,
          },
          {
            label: "Gateway",
            icon: <Share2 className="h-5 w-5" />,
            onClick: () => setShareOpen(true),
            tone: "bg-emerald-500/10 text-emerald-500",
            badge: 0,
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="relative p-3 rounded-2xl bg-card border border-border flex flex-col items-center gap-2 active:scale-95"
          >
            {a.badge > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.tone}`}>
              {a.icon}
            </div>
            <span className="text-xs font-semibold text-foreground">{a.label}</span>
          </button>
        ))}
      </div>

      <KPI label="Pending Signups" val={String(pendingList.length)} tone="cta" />
<KPI label="Active Shipments" val={String(ordersList.filter((o) => o.status !== "delivered").length)} tone="primary" />
<KPI label="Customers" val={String(userCounts?.customers ?? 0)} tone="primary" />
<KPI label="Vendors" val={String(userCounts?.vendors ?? 0)} tone="cta" />
<KPI label="Riders" val={String(userCounts?.riders ?? 0)} tone="primary" />

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
  ordersList: RealOrder[];
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

  if (tab === "home") return <LogisticsHome orders={orders} riders={riders} />;
  if (tab === "telemetry") return <LogisticsTelemetry />;
  if (tab === "settings") return <SignOutComponent user={user} />;

  // Default to users/inbox tab - show pending and assigned orders
  const inboundOrders = orders.filter((o) => o.status === "pending" || o.status === "assigned");
  const activeOrders = orders.filter((o) => o.status === "accepted" || o.status === "in_transit");

  const getOrderType = (o: RealOrder) => {
    const vendorItem = o.order_items?.find((it) => it.product?.vendor);
    if (vendorItem) {
      return {
        label: vendorItem.product?.vendor?.registered_business_name
          ? `Vendor • ${vendorItem.product.vendor.registered_business_name}`
          : "Vendor Booking",
        tone: "bg-purple-500/10 text-purple-500",
      };
    }
    if (o.park_name) {
      return { label: "Park Waybill", tone: "bg-amber-500/10 text-amber-500" };
    }
    return { label: "Customer Booking", tone: "bg-blue-500/10 text-blue-500" };
  };

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
            {inboundOrders.map((o) => {
              const orderType = getOrderType(o);
              return (
              <div key={o.id} className="p-4 rounded-2xl bg-card border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{o.item_description}</p>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${orderType.tone}`}>
                    {orderType.label}
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
              );
            })}
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

function LogisticsHome({ orders, riders }: { orders: RealOrder[]; riders: RealRider[] }) { 
  const pending = orders.filter((o) => o.status === "pending").length;
  const inTransit = orders.filter((o) => o.status ==="in_transit").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">Operations Overview</h3>
      <div className="grid grid-cols-2 gap-2.5">
        < KPI label="Awaiting Dispatch" val={String(pending)} tone="cta"/>
        < KPI label="In Transit" val={String(inTransit)} tone="primary"/>
        < KPI label="Delivered" val={String(delivered)} tone="primary"/>
        < KPI label="Available Riders" val={String(riders.length)} tone="cta"/>
      </div>
    </div>
  )
}

function LogisticsTelemetry() {
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [selected, setSelected] = useState<RealOrder | null>(null);
  const [lastPings, setLastPings] = useState<Record<string, { lat: string; lng: string; ts: string }>>({});
  const [connected, setConnected] = useState(false);

  // 1. Load active orders (non-delivered, non-pending) on mount
  useEffect(() => {
    supabase
      .from("orders")
      .select(`
        id, item_description, status, park_name,
        sender_location, receiver_location,
        rider:assigned_rider_id (
          id,
          users:users!riders_user_id_fkey (first_name, last_name)
        ),
        customer:customer_id (first_name, last_name),
        order_items (
          id,
          quantity,
          product:product_id (
            name,
            vendor:vendor_id (registered_business_name)
          )
        )
      `)
      .in("status", ["assigned", "accepted", "in_transit", "out_for_delivery"])
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setOrders(data as any); });

    // 2. Subscribe to order status changes
    const orderChannel = supabase
      .channel("telemetry-order-updates")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          supabase
            .from("orders")
            .select(`id, item_description, status, park_name, sender_location, receiver_location,
              rider:assigned_rider_id (id, users:users!riders_user_id_fkey (first_name, last_name)),
              customer:customer_id (first_name, last_name),
              order_items (
                id,
                quantity,
                product:product_id (
                  name,
                  vendor:vendor_id (registered_business_name)
                )
              )`)
            .in("status", ["assigned", "accepted", "in_transit", "out_for_delivery"])
            .order("created_at", { ascending: false })
            .then(({ data }) => { if (data) setOrders(data as any); });
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    // 3. Subscribe to GPS pings — update last known position per order
    const pingChannel = supabase
      .channel("telemetry-pings")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry_events" },
        (payload) => {
          const e = payload.new as any;
          setLastPings((prev) => ({
            ...prev,
            [e.shipment_id]: {
              lat: String(e.lat),
              lng: String(e.lng),
              ts: new Date(e.recorded_at).toLocaleTimeString(),
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(pingChannel);
    };
  }, []);

  const getOrderType = (o: RealOrder) => {
    const vendorItem = o.order_items?.find((it) => it.product?.vendor);
    if (vendorItem) {
      return vendorItem.product?.vendor?.registered_business_name
        ? `Vendor • ${vendorItem.product.vendor.registered_business_name}`
        : "Vendor Booking";
    }
    if (o.park_name) return "Park Waybill";
    return "Customer Booking";
  };

  const statusColor: Record<string, string> = {
    assigned: "bg-amber-500/10 text-amber-500",
    accepted: "bg-blue-500/10 text-blue-500",
    in_transit: "bg-primary/10 text-primary",
    out_for_delivery: "bg-emerald-500/10 text-emerald-500",
  };

  if (selected) {
    const ping = lastPings[selected.id];
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
          <p className="text-sm font-bold text-foreground">{selected.item_description}</p>
          <p className="text-xs text-muted-foreground">
            {getOrderType(selected)} ·{" "}
            <span className={`font-bold ${statusColor[selected.status] ?? ""}`}>
              {selected.status.replace("_", " ")}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Origin: {selected.sender_location}
          </p>
          <p className="text-xs text-muted-foreground">
            Destination: {selected.receiver_location}
          </p>
          {ping && (
            <p className="text-xs text-emerald-500 font-mono">
              Last ping: {ping.lat}, {ping.lng} at {ping.ts}
            </p>
          )}
        </div>

        {/* Map — OpenStreetMap iframe, no API key needed */}
        {ping ? (
          <iframe
            title="Live position"
            className="w-full h-56 rounded-2xl border border-border"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              Number(ping.lng) - 0.01
            },${Number(ping.lat) - 0.01},${Number(ping.lng) + 0.01},${
              Number(ping.lat) + 0.01
            }&layer=mapnik&marker=${ping.lat},${ping.lng}`}
          />
        ) : (
          <div className="h-56 rounded-2xl bg-card border border-border flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No GPS ping yet for this shipment.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Route: {selected.sender_location} → {selected.receiver_location}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Live status bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
        <span className="text-[10px] font-mono text-muted-foreground">
          {connected ? "Stream: Live Socket Connection" : "Stream: Connecting..."}
        </span>
        <span className="ml-auto text-[10px] font-bold text-foreground">{orders.length} active</span>
      </div>

      {/* Filter tabs by delivery type */}
      {orders.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground rounded-2xl bg-card border border-border">
          No active shipments in transit.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const ping = lastPings[o.id];
            const rider = (o.rider as any)?.users;
            return (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full p-3 rounded-2xl bg-card border border-border text-left active:scale-[0.99] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground truncate">{o.item_description}</p>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor[o.status] ?? "bg-muted text-muted-foreground"}`}>
                    {o.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {getOrderType(o)} ·{" "}
                  {rider ? `${rider.first_name} ${rider.last_name}` : "Unassigned"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {o.sender_location} → {o.receiver_location}
                </p>
                {ping && (
                  <p className="text-[10px] text-emerald-500 font-mono">
                    Last ping {ping.ts} · {ping.lat}, {ping.lng}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
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
    } catch {
      toast.error("Sign out process encountered a fault");
    } finally {
      setIsSignOutPending(false);
    }
  };

  return (
  <div className="space-y-3">
    <InstallAppBanner />

    {/* History */}
    <button
      onClick={() => navigate({ to: "/history" })}
      className="w-full p-4 rounded-2xl bg-card border border-border flex items-center justify-between active:scale-[0.99]"
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-foreground">Transaction History</p>
        <p className="text-[11px] text-muted-foreground">View all order logs</p>
      </div>
      <span className="text-muted-foreground text-lg">→</span>
    </button>

    {/* Dark mode */}
    <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
      <p className="text-sm font-semibold text-foreground">Toggle Light / Dark Mode</p>
      <DarkModeToggle size="md" />
    </div>

    {/* Log Out — styled consistently with the rest */}
    <button
      onClick={handleSignOut}
      disabled={isSignOutPending}
      className="w-full p-4 rounded-2xl bg-card border border-border flex items-center justify-between active:scale-[0.99] disabled:opacity-50"
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-red-500">Log Out</p>
        <p className="text-[11px] text-muted-foreground">End your admin session</p>
      </div>
      {isSignOutPending
        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        : <LogOut className="h-4 w-4 text-red-500" />}
    </button>
  </div>
);
}
