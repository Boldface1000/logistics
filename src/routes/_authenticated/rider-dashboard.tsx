/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Inbox,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  User,
  Truck,
  LogOut,
  Moon,
  Sun,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ReceiptModal } from "@/components/ReceiptModal";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/client";
import { AuthUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/rider-dashboard")({
  head: () => ({ meta: [{ title: "Rider Dashboard — EasyBlue Logistics" }] }),
  component: RiderDashboard,
});

type Tab = "home" | "assignments" | "history" | "settings";

function RiderDashboard() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const queryClient = useQueryClient();

  // 1. Fetch current active session
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["rider-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  const userId = sessionData?.user?.id;

  // 2. Fetch profile metrics from database View mapping
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["rider-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId!).single();
      if (error) throw error;
      return data;
    },
  });

  // 3. Fetch rider registration & deployment status safely with schema fallbacks
  const { data: riderProfile, isLoading: riderLoading } = useQuery({
    queryKey: ["rider-verification", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riders")
        .select("id, approval, deployment_status")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 4. Fetch orders assigned to this rider node including status_version and schema.sql native keys
  const { data: myOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["rider-orders", riderProfile?.id],
    enabled: !!riderProfile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, item_description, status, status_version, recipient_name, receiver_name, receiver_phone, sender_location, receiver_location, payment_method, payment_mode, assigned_rider_id",
        )
        .eq("assigned_rider_id", riderProfile!.id);
      if (error) throw error;
      return data || [];
    },
  });

  if (loading || sessionLoading || profileLoading || riderLoading || ordersLoading) {
    return (
      <MobileShell>
        <PageLoader label="Connecting Rider Link..." />
      </MobileShell>
    );
  }

  // Security guard walls
  if (!sessionData) {
    navigate({ to: "/login" });
    return null;
  }

  if (!riderProfile || riderProfile.approval !== "approved") {
    navigate({ to: "/pending-approval", search: { role: "rider" } });
    return null;
  }

  // Filter orders into corresponding tabs based on schema status
  const assignments = myOrders.filter((o) => o.status === "assigned" || o.status === "pending");
  const active = myOrders.filter((o) => o.status === "accepted" || o.status === "in_transit");
  const history = myOrders.filter(
    (o) =>
      o.status === "delivered" ||
      o.status === "accepted" ||
      o.status === "in_transit" ||
      o.status === "cancelled",
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
    {
      id: "assignments",
      label: "Assignments",
      icon: <Inbox className="h-[22px] w-[22px]" />,
      badge: assignments.length,
    },
    { id: "history", label: "History", icon: <HistoryIcon className="h-[22px] w-[22px]" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-[22px] w-[22px]" /> },
  ];

  return (
    <MobileShell>
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <header
          className="safe-top px-5 pt-2 pb-6 bg-primary text-primary-foreground"
          style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
        >
          <h1 className="text-2xl font-bold">Hello, {userProfile?.first_name || "Rider"}</h1>
          <p className="text-sm opacity-80 mt-1">
            {active.length} active · {assignments.length} new
          </p>
        </header>

        <div className="px-4 pt-4">
          {tab === "home" && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Welcome back</p>
              <p className="text-xs text-muted-foreground">
                Open <span className="font-semibold text-foreground">Assignments</span> to review
                newly dispatched orders. Approve to add them to your run, decline to release them
                back to the operations desk.
              </p>
            </div>
          )}

          {tab === "assignments" && (
            <>
              <h2 className="text-base font-bold text-foreground mb-3">Incoming assignments</h2>
              {assignments.length === 0 ? (
                <Empty label="No new assignments." />
              ) : (
                <div className="flex flex-col gap-3">
                  {assignments.map((o) => (
                    <AssignmentCard key={o.id} order={o} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "history" && (
            <>
              <h2 className="text-base font-bold text-foreground mb-3">History</h2>
              {history.length === 0 ? (
                <Empty label="No accepted orders yet." />
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((o) => (
                    <RiderHistoryRow key={o.id} order={o} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "settings" && (
            <SettingsPanel
              user={userProfile}
              onSignOut={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            />
          )}
        </div>
      </main>

      <nav
        className="mt-auto mx-4 z-30 flex items-center justify-between gap-1 px-4 py-2 rounded-full
                   border border-white/30 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-2xl
                   shadow-[0_8px_32px_rgba(25,25,112,0.25)]"
        style={{ marginBottom: `calc(env(safe-area-inset-bottom, 0px) + 6px)` }}
      >
        {tabs.map((t) => {
          const activeTab = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              className={`relative h-11 w-11 rounded-full flex items-center justify-center transition active:scale-90 ${
                activeTab
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-foreground/80"
              }`}
              type="button"
            >
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
    </MobileShell>
  );
}

function AssignmentCard({ order }: { order: any }) {
  const queryClient = useQueryClient();

  // Mutation to handle choices using Optimistic Locking checks
  const respondMutation = useMutation({
    mutationFn: async ({ accept }: { accept: boolean }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: accept ? ("accepted" as any) : ("pending" as any),
          assigned_rider_id: accept ? order.assigned_rider_id : null,
        })
        .eq("id", order.id)
        .eq("status_version", order.status_version); // Match baseline version tracker

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      if (variables.accept) {
        toast.success("Order accepted", {
          description: `${order.id.slice(0, 8)} added to your run.`,
        });
      } else {
        toast("Order declined", { description: "Operations desk notified." });
      }
    },
    onError: (err: any) => {
      console.error("State machine concurrency exception:", err);
      toast.error("Action blocked", {
        description: "This assignment was already updated by another operator or system event.",
      });
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
  });

  return (
    <div className="p-4 rounded-2xl bg-card border border-border">
      <p className="text-sm font-bold text-foreground">{order.item_description}</p>
      <p className="text-[11px] text-muted-foreground mb-2">ID: {order.id.slice(0, 8)}</p>
      <div className="text-xs space-y-1 mb-3">
        <Field
          icon={<User className="h-3.5 w-3.5" />}
          label={`${order.recipient_name || order.receiver_name || "Recipient"}`}
        />
        <Field icon={<Phone className="h-3.5 w-3.5" />} label={order.receiver_phone || "—"} />
        <Field
          icon={<MapPin className="h-3.5 w-3.5 text-success" />}
          label={`Sender: ${order.sender_location || "—"}`}
        />
        <Field
          icon={<MapPin className="h-3.5 w-3.5 text-cta" />}
          label={`Receiver: ${order.receiver_location || "—"}`}
        />
        <Field
          icon={<Phone className="h-3.5 w-3.5" />}
          label={`Payment: ${order.payment_method || order.payment_mode || "Paid"}`}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => respondMutation.mutate({ accept: false })}
          disabled={respondMutation.isPending}
          className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          type="button"
        >
          <XCircle className="h-4 w-4" /> Decline
        </button>
        <button
          onClick={() => respondMutation.mutate({ accept: true })}
          disabled={respondMutation.isPending}
          className="flex-1 h-10 rounded-xl bg-success text-success-foreground font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          type="button"
        >
          <CheckCircle2 className="h-4 w-4" /> Approve
        </button>
      </div>
    </div>
  );
}

function Field({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground/90">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-10 rounded-2xl bg-card border border-border">
      <Truck className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function SettingsPanel({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const { theme, toggle } = useTheme();
  const profileUser: AuthUser | null = user
    ? {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role ?? "rider",
        approval: user.approval ?? "pending",
      }
    : null;
  return (
    <div>
      <ProfileHeader user={profileUser} />
      <button
        onClick={toggle}
        className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 mb-3 active:scale-[0.99]"
        type="button"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-cta" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Dark mode</span>
        <span className="text-xs text-muted-foreground">{theme === "dark" ? "On" : "Off"}</span>
      </button>
      <button
        onClick={onSignOut}
        className="w-full p-4 rounded-2xl bg-destructive/10 text-destructive flex items-center gap-3 active:scale-[0.99] font-semibold text-sm border border-destructive/10"
        type="button"
      >
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </div>
  );
}

function RiderHistoryRow({ order }: { order: any }) {
  const [open, setOpen] = useState(false);

  // Map updated parameters to pass proper objects to the view modal components cleanly
  const transformedOrder = {
    id: order.id,
    itemDescription: order.item_description,
    status: order.status,
    receiverName: order.recipient_name || order.receiver_name,
    receiverPhone: order.receiver_phone,
    senderLocation: order.sender_location,
    receiverLocation: order.receiver_location,
    paymentMode: order.payment_method || order.payment_mode,
  };

  return (
    <>
      <div className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{order.item_description}</p>
          <p className="text-[11px] text-muted-foreground">
            ID: {order.id.slice(0, 8)} · {order.status}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="View receipt"
          className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-95"
          type="button"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>
      <ReceiptModal
        order={transformedOrder as any}
        open={open}
        onOpenChange={setOpen}
        userType="rider"
      />
    </>
  );
}
