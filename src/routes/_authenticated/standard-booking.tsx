/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Bike, ArrowRight, MapPinCheck } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/client";
import { safeText, digitsOnly, nameOnly, maxLen } from "@/lib/validators";

export const Route = createFileRoute("/_authenticated/standard-booking")({
  head: () => ({ meta: [{ title: "Standard Booking — EasyBlue Logistics" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    type:
      search.type === "inter_state" || search.type === "intra_state"
        ? (search.type as "intra_state" | "inter_state")
        : "intra_state",
  }),
  component: StandardBookingPage,
});

function StandardBookingPage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const { type: orderType } = useSearch({ from: "/_authenticated/standard-booking" });
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    auth.current().then((u) => setRole(u?.role ?? null));
  }, []);
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
        <PageLoader label="Standard Booking 🛵" />
      </MobileShell>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await auth.current();
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

      // Pass the delivery type that was selected on this screen
      // (orderType comes from the `type` search param set by the dashboard nav)
      if (orderId) {
        await supabase
          .from("orders")
          .update({ order_type: orderType })
          .eq("id", orderId);
      }

      toast.success("Booking confirmed ", {
        description: `Reference ${orderId} — Your rider is on the Way 🎉.`,
      });
      navigate({ to: backTarget(role) });
    } catch (err: any) {
      console.error("Order Persistence Error:", err);
      toast.error("Failed to confirm booking", {
        description: err.message || "An unexpected error occurred 😕 Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-3 flex items-center gap-3 border-b border-border">
        <Link
          to={backTarget(role)}
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
            onChange={(v) => setSenderName(nameOnly(maxLen(v, 20)))}
            placeholder="Full name"
          />
          <Field
            label="Sender Location (where is the item coming from?)"
            value={senderLocation}
            onChange={(v) => setSenderLocation(safeText(maxLen(v, 50)))}
            placeholder="Pickup point 📬"
          />
          <Field
            label="Sender Phone_Number"
            value={senderPhone}
            onChange={(v) => setSenderPhone(digitsOnly(maxLen(v, 11)))}
            placeholder="e.g. 080…"
          />

          <Field
            label="Receiver Name"
            value={receiverName}
            onChange={(v) => setReceiverName(nameOnly(maxLen(v, 20)))}
            placeholder="Full name"
          />
          <Field
            label="Receiver Location (where is the item going to?)"
            value={receiverLocation}
            onChange={(v) => setReceiverLocation(safeText(maxLen(v, 50)))}
            placeholder="Drop-off point 📩"
          />
          <Field
            label="Receiver Phone_Number"
            value={receiverPhone}
            onChange={(v) => setReceiverPhone(digitsOnly(maxLen(v, 11)))}
            placeholder="e.g. 080…"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Mode of payment</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as "transfer" | "cash")}
              className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option className="text-blue-900" value="transfer">
                Transfer
              </option>
              <option className="text-blue-900" value="cash">
                Cash
              </option>
            </select>
          </div>

          <Field
            label="Item type / description"
            value={item}
            onChange={(v) => setItem(safeText(maxLen(v, 50)))}
            placeholder="Documents, food, package… 📦"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              "Booking your Order… "
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

function backTarget(role: string | null): "/dashboard" | "/vendor-dashboard" {
  return role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
