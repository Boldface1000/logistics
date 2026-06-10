import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bike, ArrowRight, MapPinCheck } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { ordersStore } from "@/lib/orders-store";

export const Route = createFileRoute("/standard-booking")({
  head: () => ({ meta: [{ title: "Standard Booking — EasyBlue" }] }),
  component: StandardBookingPage,
});

function StandardBookingPage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [item, setItem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <MobileShell><PageLoader label="Standard Booking" /></MobileShell>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.current();
    if (!user) { toast.error("Please sign in"); navigate({ to: "/login" }); return; }
    if (!pickup || !dropoff || !item) { toast.error("All fields required"); return; }
    setSubmitting(true);
    setTimeout(() => {
      const o = ordersStore.create({
        type: "standard",
        customerEmail: user.email,
        customerFirstName: user.firstName,
        customerLastName: user.lastName,
        customerPhone: user.phone ?? "",
        pickup, dropoff, itemDescription: item,
      });
      toast.success("Booking confirmed", { description: `Reference ${o.id} — a rider will be assigned shortly.` });
      navigate({ to: backTarget() });
    }, 600);
  };

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-3 flex items-center gap-3 border-b border-border">
        <Link to={backTarget()} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Standard Booking</h1>
          <p className="text-xs text-muted-foreground">Door-to-door rider dispatch</p>
        </div>
        <Bike className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6 scrollbar-hide">
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Pickup address" value={pickup} onChange={setPickup} placeholder="Where should we collect?" />
          <Field label="Drop-off address" value={dropoff} onChange={setDropoff} placeholder="Where should we deliver?" />
          <Field label="Item type / description" value={item} onChange={setItem} placeholder="Documents, food, package…" />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Booking…" : (<>Confirm Booking <ArrowRight className="h-4 w-4" /> <MapPinCheck className="h-4 w-4" /></>)}
          </button>
        </form>
      </main>
    </MobileShell>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function backTarget(): "/dashboard" | "/vendor-dashboard" {
  const u = auth.current();
  return u?.role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
