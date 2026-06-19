import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Store,
  X,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Layers,
  Calendar,
  Package,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader } from "@/components/PageLoader";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/admin-vendors")({
  head: () => ({ meta: [{ title: "Approved Vendors — EasyBlue" }] }),
  component: AdminVendorsPage,
});

function AdminVendorsPage() {
  const navigate = useNavigate();
  const [openVendor, setOpenVendor] = useState<{ id: string; name: string } | null>(null);

  // 1. Fetch Approved Vendors by joining the profiles view
  const { data: approvedVendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["admin-approved-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(
          `
          id,
          registered_business_name,
          business_phone,
          rating,
          user_id,
          profiles:user_id (
            email,
            first_name,
            last_name
          )
        `,
        )
        .eq("approval", "approved");

      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch Inventory Items for the selected vendor
  const { data: vendorStocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ["vendor-stocks", openVendor?.id],
    enabled: !!openVendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_stocks")
        .select("*")
        .eq("vendor_id", openVendor!.id)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (vendorsLoading) {
    return <PageLoader />;
  }

  return (
    <MobileShell>
      <div className="p-4 flex flex-col gap-4 min-h-screen pb-24 bg-background">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Logistics Management</h1>
            <p className="text-xs text-muted-foreground">Approved network vendors & inventory</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {approvedVendors.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground text-sm">
              No approved vendors found in database.
            </div>
          ) : (
            approvedVendors.map((vendor) => {
              const owner = vendor.profiles;

              return (
                <div
                  key={vendor.id}
                  className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between transition hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {vendor.registered_business_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Owner: {owner?.first_name} {owner?.last_name} • {vendor.business_phone}
                      </p>
                      <p className="text-[10px] text-amber-500 font-mono mt-0.5">
                        Rating: ★ {Number(vendor.rating || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setOpenVendor({ id: vendor.id, name: vendor.registered_business_name })
                    }
                    className="h-9 px-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Eye className="h-3.5 w-3.5" /> Inventory
                  </button>
                </div>
              );
            })
          )}
        </div>

        {openVendor && (
          <VendorStocksModal
            vendorId={openVendor.id}
            vendorName={openVendor.name}
            stocks={vendorStocks}
            loading={stocksLoading}
            onClose={() => setOpenVendor(null)}
          />
        )}
      </div>
    </MobileShell>
  );
}

interface StockPayload {
  id?: string;
  product_type: string;
  quantity: number;
  received_at: string;
  image_url?: string;
}

function VendorStocksModal({
  vendorId,
  vendorName,
  stocks,
  loading,
  onClose,
}: {
  vendorId: string;
  vendorName: string;
  stocks: any[];
  loading: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (payload: StockPayload) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const targetRow = {
        product_type: payload.product_type,
        quantity: payload.quantity,
        received_at: payload.received_at,
        image_url: payload.image_url,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { error } = await supabase
          .from("vendor_stocks")
          .update(targetRow)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendor_stocks").insert({
          ...targetRow,
          vendor_id: vendorId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-stocks", vendorId] });
      toast.success("Inventory metrics updated successfully");
      setEditor(null);
      setIsAdding(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update storage context");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_stocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-stocks", vendorId] });
      toast.success("Stock row removed cleanly");
      setEditor(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to remove entry");
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col justify-end sm:justify-center p-4">
      <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <h2 className="text-sm font-bold text-foreground truncate max-w-[280px]">
              {vendorName}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Logistics warehouse storage tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-input flex items-center justify-center text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !isAdding && !editor ? (
            <>
              <button
                onClick={() => setIsAdding(true)}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <Plus className="h-4 w-4" /> Add Incoming Stock
              </button>

              <div className="flex flex-col gap-2">
                {stocks.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground p-6">
                    No stock tracked for this vendor node.
                  </p>
                ) : (
                  stocks.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-input flex items-center justify-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.product_type}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-0.5 font-semibold text-primary">
                              <Layers className="h-3 w-3" /> Qty: {item.quantity}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" /> {item.received_at}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEditor(item)}
                          className="h-8 w-8 rounded-lg bg-input border border-border flex items-center justify-center text-foreground hover:text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Remove this stock record permanent entry?")) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/10 hover:bg-destructive/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <StockSubForm
              initial={editor}
              pending={saveMutation.isPending}
              onCancel={() => {
                setEditor(null);
                setIsAdding(false);
              }}
              onSave={(data) => saveMutation.mutate(data)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StockSubForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial?: any;
  pending: boolean;
  onCancel: () => void;
  onSave: (data: any) => void;
}) {
  const [productType, setProductType] = useState(initial?.product_type || "");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() || "");
  const [receivedAt, setReceivedAt] = useState(
    initial?.received_at || new Date().toISOString().split("T")[0],
  );
  const [imageDataUrl, setImageDataUrl] = useState(initial?.image_url || "");

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      if (resultStr.length > 200000) {
        toast.error("Image file resolution is too large for storage payload.");
        return;
      }
      setImageDataUrl(resultStr);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!productType.trim() || !quantity.trim()) {
      toast.error("Please populate all vital required fields");
      return;
    }
    onSave({
      id: initial?.id,
      product_type: productType.trim(),
      quantity: parseInt(quantity, 10) || 0,
      received_at: receivedAt,
      image_url: imageDataUrl,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          {initial ? "Modify Item Metrics" : "New Shipment Ledger"}
        </h3>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:underline">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Product Type
          </label>
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            placeholder="e.g. Premium Motor Engine Hub"
            className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Received On
            </label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Item Visualization Snapshot
          </label>
          <div className="flex items-center gap-3">
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt=""
                className="h-12 w-12 rounded-xl object-cover border border-border"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={pending}
          className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initial ? (
            "Save Changes"
          ) : (
            "Commit to Stock Ledger"
          )}
        </button>
      </div>
    </div>
  );
}
