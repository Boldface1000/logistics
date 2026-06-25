/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/_authenticated/marketplace-checkout")({
  head: () => ({ meta: [{ title: "Marketplace Checkout — EasyBlue" }] }),
  component: MarketplaceCheckoutPage,
});

function MarketplaceCheckoutPage() {
  const artificialLoading = useArtificialLoading(450);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    auth.current().then((u) => setRole(u?.role ?? null));
  }, []);

  // State Management for Purchase Flow
  const [selectedStockId, setSelectedStockId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMode, setPaymentMode] = useState<"transfer" | "cash">("transfer");

  // Delivery Metadata State
  const [receiverName, setReceiverName] = useState("");
  const [receiverLocation, setReceiverLocation] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  // 1. Fetch available vendor inventories to populate checkout options
  const { data: availableStocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ["marketplace-stocks"],
    queryFn: async () => {
      // Pulls active stocks alongside vendor text definitions
      const { data, error } = await supabase.from("vendor_stocks").select(`
          id,
          vendor_id,
          product_type,
          quantity,
          price_cents,
          vendors (
            registered_business_name,
            business_phone
          )
        `);
      if (error) throw error;
      return data || [];
    },
  });

  // Find currently selected stock item record details
  const selectedStockItem = availableStocks.find((s) => s.id === selectedStockId);

  // Real per-unit price, sourced from the vendor's own stock record
  const unitPriceCents = selectedStockItem?.price_cents ?? 0;
  const totalCents = quantity * unitPriceCents;

  // 2. Transactional Mutation for Order Placement
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const user = await auth.current();
      if (!user) throw new Error("Authentication required. Please sign back in.");
      if (!selectedStockItem)
        throw new Error("Please select a product from the marketplace options.");

      // Direct connection hook to atomic database procedure
      const { data: orderId, error } = await supabase.rpc("create_marketplace_order", {
        p_customer_id: user.id,
        p_vendor_id: selectedStockItem.vendor_id,
        p_product_type: selectedStockItem.product_type,
        p_purchase_quantity: quantity,
        p_sender_name:
          (selectedStockItem.vendors as any)?.registered_business_name || "Marketplace Vendor",
        p_sender_location: "Vendor Fulfillment Depot",
        p_sender_phone: (selectedStockItem.vendors as any)?.business_phone || "",
        p_receiver_name: receiverName,
        p_receiver_location: receiverLocation,
        p_receiver_phone: receiverPhone,
        p_payment_mode: paymentMode,
        p_total_cents: totalCents,
      });

      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => {
      toast.success("Purchase Complete!", {
        description: `Order ${orderId?.slice(0, 8)} secured and inventory deducted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["marketplace-stocks"] });
      navigate({ to: backTarget(role) });
    },
    onError: (err: any) => {
      console.error("Atomic transaction processing exception:", err);
      toast.error("Checkout Failed", {
        description: err.message || "Could not complete order. Stock levels may have shifted.",
      });
    },
  });

  if (artificialLoading || stocksLoading) {
    return (
      <MobileShell>
        <PageLoader label="Opening Marketplace Link..." />
      </MobileShell>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId) {
      toast.error("Please choose an item from the marketplace list.");
      return;
    }
    if (!receiverName.trim() || !receiverLocation.trim() || !receiverPhone.trim()) {
      toast.error("All delivery drop-off fields are required.");
      return;
    }
    if (selectedStockItem && quantity > selectedStockItem.quantity) {
      toast.error("Order quantity surpasses available vendor inventory limits.");
      return;
    }
    checkoutMutation.mutate();
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
          <h1 className="text-base font-bold text-foreground">Marketplace Order</h1>
          <p className="text-xs text-muted-foreground">Transactional Inventory Checkout</p>
        </div>
        <ShoppingBag className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-6 scrollbar-hide">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          {/* Product Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Select Available Product</label>
            <select
              value={selectedStockId}
              onChange={(e) => {
                setSelectedStockId(e.target.value);
                setQuantity(1);
              }}
              className="h-12 px-4 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose Item from Stock --</option>
              {availableStocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.product_type} ({(stock.vendors as any)?.registered_business_name}) —{" "}
                  {stock.quantity} left
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Context Banner for Quantity Selection */}
          {selectedStockItem && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Stock Check:</span> Each unit costs{" "}
                <span className="font-semibold text-foreground">
                  ₦{(unitPriceCents / 100).toLocaleString()}
                </span>
                . Maximum safe deduction ceiling for this item is currently{" "}
                {selectedStockItem.quantity} units.
              </div>
            </div>
          )}

          {/* Quantity Counter Box */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Quantity Required</label>
            <input
              type="number"
              min={1}
              max={selectedStockItem ? selectedStockItem.quantity : 99}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-12 px-4 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Receiver Drop-off Details Block */}
          <div className="pt-2 border-t border-dashed border-border space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Delivery Destination
            </h3>

            <Field
              label="Recipient Name"
              value={receiverName}
              onChange={setReceiverName}
              placeholder="Full name of receiver"
            />
            <Field
              label="Drop-off Destination Address"
              value={receiverLocation}
              onChange={setReceiverLocation}
              placeholder="Detailed delivery address"
            />
            <Field
              label="Recipient Phone Number"
              value={receiverPhone}
              onChange={setReceiverPhone}
              placeholder="e.g. +23480..."
            />
          </div>

          {/* Payment Mode Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Payment Settlement Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as "transfer" | "cash")}
              className="h-12 px-4 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="transfer">Bank Transfer</option>
              <option value="cash">Cash on Delivery</option>
            </select>
          </div>

          {/* Atomic Submission Action Button */}
          <button
            type="submit"
            disabled={checkoutMutation.isPending}
            className="mt-3 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98] disabled:opacity-60"
          >
            {checkoutMutation.isPending ? (
              "Securing Transaction..."
            ) : (
              <>
                Pay ₦{(totalCents / 100).toLocaleString()} <ArrowRight className="h-4 w-4" />{" "}
                <ShieldCheck className="h-4 w-4" />
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
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 px-4 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function backTarget(role: string | null): "/dashboard" | "/vendor-dashboard" {
  return role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
