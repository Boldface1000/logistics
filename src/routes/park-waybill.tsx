import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bus, ArrowRight, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { ordersStore } from "@/lib/orders-store";

export const Route = createFileRoute("/park-waybill")({
  head: () => ({ meta: [{ title: "Park Waybill — EasyBlue" }] }),
  component: ParkWaybillPage,
});

function ParkWaybillPage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <MobileShell><PageLoader label="Park Waybill" /></MobileShell>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.current();
    if (!user) { toast.error("Please sign in"); navigate({ to: "/login" }); return; }
    if (!pickup || !dropoff || !desc) { toast.error("All fields required"); return; }
    setSubmitting(true);
    setTimeout(() => {
      const o = ordersStore.create({
        type: "waybill",
        customerEmail: user.email,
        customerFirstName: user.firstName,
        customerLastName: user.lastName,
        customerPhone: user.phone ?? "",
        pickup, dropoff, itemDescription: desc,
      });
      toast.success("Waybill booked", { description: `Reference ${o.id} — assigning a park rider.` });
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
          <h1 className="text-base font-bold text-foreground">Park Waybill</h1>
          <p className="text-xs text-muted-foreground">Inter-park parcel transit</p>
        </div>
        <Bus className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6 scrollbar-hide">
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Pickup park / address" value={pickup} onChange={setPickup} placeholder="e.g. Jibowu Park, Lagos" />
          <Field label="Drop-off park / address" value={dropoff} onChange={setDropoff} placeholder="e.g. Upper Iweka, Onitsha" />
          <Field label="Parcel description" value={desc} onChange={setDesc} placeholder="What is being shipped?" textarea />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Booking…" : (<>Book Waybill <ArrowRight className="h-4 w-4" /> <MapIcon className="h-4 w-4" /></>)}
          </button>
        </form>
      </main>
    </MobileShell>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      ) : (
        <input
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </div>
  );
}

function backTarget(): "/dashboard" | "/vendor-dashboard" {
  const u = auth.current();
  return u?.role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
