/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Bus, ArrowRight, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/_authenticated/park-waybill")({
  head: () => ({ meta: [{ title: "Park Waybill — EasyBlue" }] }),
  component: ParkWaybillPage,
});

function ParkWaybillPage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    auth.current().then((u) => setRole(u?.role ?? null));
  }, []);
  const [parkName, setParkName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [driverOrStorekeeperNumber, setDriverOrStorekeeperNumber] = useState("");
  const [nameOnParcel, setNameOnParcel] = useState("");
  const [phoneNumberOnParcel, setPhoneNumberOnParcel] = useState("");
  const [waybill, setWaybill] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [contentOfItem, setContentOfItem] = useState("");
  const [amountToBePaid, setAmountToBePaid] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [dropOffPoint, setDropOffPoint] = useState("");
  const [dropOffNumber, setDropOffNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);

  if (loading)
    return (
      <MobileShell>
        <PageLoader label="Park Waybill" />
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
    const requiredOk =
      parkName.trim() &&
      contactNumber.trim() &&
      driverOrStorekeeperNumber.trim() &&
      nameOnParcel.trim() &&
      phoneNumberOnParcel.trim() &&
      contentOfItem.trim() &&
      amountToBePaid.trim() &&
      receiverName.trim() &&
      dropOffPoint.trim() &&
      dropOffNumber.trim();

    if (!requiredOk) {
      toast.error("All required fields must be filled");
      return;
    }

    setSubmitting(true);

    try {
      // Cast the incoming text input representation into safe integers for cents tracking
      const derivedTotalCents = amountToBePaid ? Math.round(parseFloat(amountToBePaid) * 100) : 0;

      // Executing the structured transaction over RPC function
      const { data: orderId, error } = await supabase.rpc("create_db_order", {
        p_customer_id: user.id,
        p_sender_name: parkName,
        p_sender_location: parkName,
        p_sender_phone: contactNumber,
        p_receiver_name: receiverName,
        p_receiver_location: dropOffPoint,
        p_receiver_phone: dropOffNumber,
        p_payment_mode: "cash", // Standard fallback default for transit stations
        p_item_description: contentOfItem,
        p_total_cents: isNaN(derivedTotalCents) ? 0 : derivedTotalCents,
        p_park_name: parkName,
        p_contact_number: contactNumber,
        p_driver_or_storekeeper_number: driverOrStorekeeperNumber,
        p_content_of_item: contentOfItem,
        p_amount_to_be_paid: amountToBePaid,
        p_drop_off_point: dropOffPoint,
      });

      if (error) throw error;

      toast.success("Waybill booked", {
        description: `Reference ${orderId} — assigning a rider.`,
      });
      navigate({ to: backTarget(role) });
    } catch (err: any) {
      console.error("Waybill Persistence Error:", err);
      toast.error("Failed to book waybill", {
        description: err.message || "An unexpected error occurred.",
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
          <h1 className="text-base font-bold text-foreground">Park Waybill</h1>
          <p className="text-xs text-muted-foreground">Inter-park parcel transit</p>
        </div>
        <Bus className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6 scrollbar-hide">
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field
            label="Park name"
            value={parkName}
            onChange={setParkName}
            placeholder="e.g. Abuja Park"
          />
          <Field
            label="Contact number"
            value={contactNumber}
            onChange={setContactNumber}
            placeholder="e.g. 080…"
          />
          <Field
            label="Driver's/ storekeeper's number"
            value={driverOrStorekeeperNumber}
            onChange={setDriverOrStorekeeperNumber}
            placeholder="e.g. 080…"
          />
          <Field
            label="Name on parcel"
            value={nameOnParcel}
            onChange={setNameOnParcel}
            placeholder="Full name"
          />
          <Field
            label="Phone number on parcel"
            value={phoneNumberOnParcel}
            onChange={setPhoneNumberOnParcel}
            placeholder="e.g. 080…"
          />
          <Field
            label="Waybill ID(optional)"
            value={waybill}
            onChange={setWaybill}
            placeholder="Reference (if any)"
          />
          <Field
            label="Delivery code (optional)"
            value={deliveryCode}
            onChange={setDeliveryCode}
            placeholder="Code (if any)"
          />
          <Field
            label="Content of item"
            value={contentOfItem}
            onChange={setContentOfItem}
            placeholder="What is being shipped?"
            textarea
          />
          <Field
            label="Amount to be paid"
            value={amountToBePaid}
            onChange={setAmountToBePaid}
            placeholder="e.g. 150,000"
          />
          <Field
            label="Receiver's name"
            value={receiverName}
            onChange={setReceiverName}
            placeholder="Full name"
          />
          <Field
            label="Drop-off point"
            value={dropOffPoint}
            onChange={setDropOffPoint}
            placeholder="e.g. DELSU, Abraka"
          />
          <Field
            label="Drop-off number"
            value={dropOffNumber}
            onChange={setDropOffNumber}
            placeholder="e.g. 080…"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              "Booking your Order…"
            ) : (
              <>
                Book Waybill <ArrowRight className="h-4 w-4" /> <MapIcon className="h-4 w-4" />
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
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </div>
  );
}

function backTarget(role: string | null): "/dashboard" | "/vendor-dashboard" {
  return role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
