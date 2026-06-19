import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bike, ArrowRight, MapPinCheck } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/standard-booking")({
  head: () => ({ meta: [{ title: "Standard Booking — EasyBlue" }] }),
  component: StandardBookingPage,
});

function StandardBookingPage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [senderName, setSenderName] = useState("");
  const [senderLocation, setSenderLocation] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverLocation, setReceiverLocation] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [paymentMode, setPaymentMode] = useState<"transfer" | "cash">("transfer");
  const [item, setItem] = useState("");

  const [submitting, setSubmitting] = useState(false);

  if (loading)
    return (
      <MobileShell>
        <PageLoader label="Standard Booking" />
      </MobileShell>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.current();
    if (!user) {
      toast.error("Please sign in");
      navigate({ to: "/login" });
      return;
    }
    if (
      !senderName.trim() ||
      !senderLocation.trim() ||
      !senderPhone.trim() ||
      !receiverName.trim() ||
      !receiverLocation.trim() ||
      !receiverPhone.trim() ||
      !item.trim() ||
      !paymentMode
    ) {
      toast.error("All fields required");
      return;
    }

    setSubmitting(true);

    try {
      // Direct call to Database RPC layer
      const { data: orderId, error } = await supabase.rpc("create_db_order", {
        p_customer_id: user.id,
        p_sender_name: senderName,
        p_sender_location: senderLocation,
        p_sender_phone: senderPhone,
        p_receiver_name: receiverName,
        p_receiver_location: receiverLocation,
        p_receiver_phone: receiverPhone,
        p_payment_mode: paymentMode,
        p_item_description: item,
        p_total_cents: 0, // Optional default baseline configuration
      });

      if (error) throw error;

      toast.success("Booking confirmed", {
        description: `Reference ${orderId} — a rider will be assigned shortly.`,
      });
      navigate({ to: backTarget() });
    } catch (err: any) {
      console.error("Database Order Persistence Error:", err);
      toast.error("Failed to confirm booking", {
        description: err.message || "An unexpected database exception occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-3 flex items-center gap-3 border-b border-border">
        <Link
          to={backTarget()}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Standard Booking</h1>
        </div>
        <Bike className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6 scrollbar-hide">
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field
            label="Sender name"
            value={senderName}
            onChange={setSenderName}
            placeholder="Full name"
          />
          <Field
            label="Sender location"
            value={senderLocation}
            onChange={setSenderLocation}
            placeholder="Pickup point"
          />
          <Field
            label="Sender phone number"
            value={senderPhone}
            onChange={setSenderPhone}
            placeholder="e.g. +2347…"
          />

          <Field
            label="Receiver name"
            value={receiverName}
            onChange={setReceiverName}
            placeholder="Full name"
          />
          <Field
            label="Receiver location"
            value={receiverLocation}
            onChange={setReceiverLocation}
            placeholder="Drop-off point"
          />
          <Field
            label="Receiver phone number"
            value={receiverPhone}
            onChange={setReceiverPhone}
            placeholder="e.g. +2347…"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Mode of payment</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as "transfer" | "cash")}
              className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <Field
            label="Item type / description"
            value={item}
            onChange={setItem}
            placeholder="Documents, food, package…"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              "Booking…"
            ) : (
              <>
                Confirm Booking <ArrowRight className="h-4 w-4" />{" "}
                <MapPinCheck className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </main>
    </MobileShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function backTarget(): "/dashboard" | "/vendor-dashboard" {
  const u = auth.current();
  return u?.role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
