import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Home, Inbox, History as HistoryIcon, Settings as SettingsIcon,
  CheckCircle2, XCircle, Phone, MapPin, User, Truck, LogOut, Moon, Sun, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ReceiptModal } from "@/components/ReceiptModal";
import { useTheme } from "@/components/ThemeProvider";
import { auth, type AuthUser } from "@/lib/auth";
import { ordersStore, type OrderRecord } from "@/lib/orders-store";
import { ridersStore } from "@/lib/riders-store";

export const Route = createFileRoute("/rider-dashboard")({
  head: () => ({ meta: [{ title: "Rider Dashboard — EasyBlue" }] }),
  component: RiderDashboard,
});

type Tab = "home" | "assignments" | "history" | "settings";

function useOrders() {
  return useSyncExternalStore(
    (cb) => ordersStore.subscribe(cb),
    () => JSON.stringify(ordersStore.list()),
    () => "[]",
  );
}

function RiderDashboard() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<AuthUser | null>(null);
  useOrders();

  useEffect(() => { setUser(auth.current()); }, []);

  if (loading) return <MobileShell><PageLoader label="Rider Dashboard" /></MobileShell>;

  const riderEntry = user ? ridersStore.findByEmail(user.email) : undefined;
  const riderId = riderEntry?.id;
  const my = riderId ? ordersStore.byRider(riderId) : [];
  const assignments = my.filter((o) => o.status === "assigned");
  const active = my.filter((o) => o.status === "accepted" || o.status === "in_transit");
  const history = my.filter((o) => o.status === "delivered" || o.status === "accepted" || o.status === "in_transit");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "home", label: "Home", icon: <Home className="h-[22px] w-[22px]" /> },
    { id: "assignments", label: "Assignments", icon: <Inbox className="h-[22px] w-[22px]" />, badge: assignments.length },
    { id: "history", label: "History", icon: <HistoryIcon className="h-[22px] w-[22px]" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-[22px] w-[22px]" /> },
  ];

  return (
    <MobileShell>
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <header className="safe-top px-5 pt-2 pb-6 bg-primary text-primary-foreground"
          style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <h1 className="text-2xl font-bold">Hello, {user?.firstName ?? "Rider"}</h1>
          <p className="text-sm opacity-80 mt-1">{active.length} active · {assignments.length} new</p>
        </header>

        <div className="px-4 pt-4">
          {tab === "home" && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Welcome back</p>
              <p className="text-xs text-muted-foreground">Open <span className="font-semibold text-foreground">Assignments</span> to review newly dispatched orders. Approve to add them to your run, decline to release them back to the records desk.</p>
            </div>
          )}

          {tab === "assignments" && (
            <>
              <h2 className="text-base font-bold text-foreground mb-3">Incoming assignments</h2>
              {assignments.length === 0 ? (
                <Empty label="No new assignments." />
              ) : (
                <div className="flex flex-col gap-3">
                  {assignments.map((o) => <AssignmentCard key={o.id} order={o} />)}
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
            <SettingsPanel user={user} onSignOut={() => { auth.signOut(); navigate({ to: "/" }); }} />
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
    </MobileShell>
  );
}

function AssignmentCard({ order }: { order: OrderRecord }) {
  const accept = () => {
    ordersStore.riderRespond(order.id, true);
    toast.success("Order accepted", { description: `${order.id} added to your run.` });
  };
  const decline = () => {
    ordersStore.riderRespond(order.id, false);
    toast("Order declined", { description: "Records desk notified." });
  };
  return (
    <div className="p-4 rounded-2xl bg-card border border-border">
      <p className="text-sm font-bold text-foreground">{order.itemDescription}</p>
      <p className="text-[11px] text-muted-foreground mb-2">{order.id}</p>
      <div className="text-xs space-y-1 mb-3">
        <Field icon={<User className="h-3.5 w-3.5" />} label={`${order.customerFirstName} ${order.customerLastName}`} />
        <Field icon={<Phone className="h-3.5 w-3.5" />} label={order.customerPhone || "—"} />
        <Field icon={<MapPin className="h-3.5 w-3.5 text-success" />} label={`Pickup: ${order.pickup}`} />
        <Field icon={<MapPin className="h-3.5 w-3.5 text-cta" />} label={`Drop-off: ${order.dropoff}`} />
      </div>
      <div className="flex gap-2">
        <button onClick={decline} className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95">
          <XCircle className="h-4 w-4" /> Decline
        </button>
        <button onClick={accept} className="flex-1 h-10 rounded-xl bg-success text-success-foreground font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95">
          <CheckCircle2 className="h-4 w-4" /> Approve
        </button>
      </div>
    </div>
  );
}

function Field({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-2 text-foreground/90"><span className="text-muted-foreground">{icon}</span>{label}</div>;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-10 rounded-2xl bg-card border border-border">
      <Truck className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function SettingsPanel({ user, onSignOut }: { user: AuthUser | null; onSignOut: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <ProfileHeader user={user} />
      <button onClick={toggle} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 mb-3 active:scale-[0.99]">
        {theme === "dark" ? <Sun className="h-5 w-5 text-cta" /> : <Moon className="h-5 w-5 text-primary" />}
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Dark mode</span>
        <span className="text-xs text-muted-foreground">{theme === "dark" ? "On" : "Off"}</span>
      </button>
      <button onClick={onSignOut} className="w-full p-4 rounded-2xl bg-destructive/10 text-destructive flex items-center gap-3 active:scale-[0.99] font-semibold text-sm">
        <LogOut className="h-5 w-5" /> Sign out
      </button>
    </div>
  );
}

function RiderHistoryRow({ order }: { order: OrderRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{order.itemDescription}</p>
          <p className="text-[11px] text-muted-foreground">{order.id} · {order.status}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="View receipt"
          className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-95"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>
      <ReceiptModal order={order} open={open} onOpenChange={setOpen} userType="rider" />
    </>
  );
}
