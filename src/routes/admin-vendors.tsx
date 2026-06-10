import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Store, X, Plus, Edit3, Trash2, Eye, Layers, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { pendingStore } from "@/lib/pending-store";
import { stocksStore, type StockItem } from "@/lib/stocks-store";

export const Route = createFileRoute("/admin-vendors")({
  head: () => ({ meta: [{ title: "Approved Vendors — EasyBlue" }] }),
  component: AdminVendorsPage,
});

function usePending() {
  return useSyncExternalStore(
    (cb) => pendingStore.subscribe(cb),
    () => JSON.stringify(pendingStore.list()),
    () => "[]",
  );
}
function useStocks() {
  return useSyncExternalStore(
    (cb) => stocksStore.subscribe(cb),
    () => JSON.stringify(stocksStore.list()),
    () => "[]",
  );
}

function AdminVendorsPage() {
  const navigate = useNavigate();
  usePending(); useStocks();
  const [openVendor, setOpenVendor] = useState<{ email: string; name: string } | null>(null);

  const approvedVendors = pendingStore.list().filter(
    (p) => p.role === "partner" && p.status === "approved",
  );

  return (
    <MobileShell>
      <header className="safe-top px-5 pt-2 pb-5 bg-primary text-primary-foreground"
        style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/admin" })}
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Product Admin</span>
        </div>
        <h1 className="text-2xl font-bold mt-3">Approved Vendors</h1>
        <p className="text-sm opacity-80">{approvedVendors.length} approved by Super Admin</p>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide pb-10 px-4 pt-4">
        {approvedVendors.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-card border border-border">
            <Store className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No approved vendors yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {approvedVendors.map((v) => {
              const name = v.businessName ?? `${v.firstName} ${v.lastName}`;
              const count = stocksStore.byVendor(v.email).length;
              return (
                <button
                  key={v.id}
                  onClick={() => setOpenVendor({ email: v.email, name })}
                  className="p-4 rounded-2xl bg-white text-[#191970] active:scale-95 transition
                             border border-white/30 backdrop-blur-xl
                             shadow-[0_8px_24px_rgba(25,25,112,0.18)] flex flex-col items-center gap-1"
                >
                  <Store className="h-5 w-5" />
                  <span className="text-sm font-bold text-center leading-tight line-clamp-2">{name}</span>
                  <span className="text-[10px] opacity-70">{count} item{count === 1 ? "" : "s"}</span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {openVendor && (
        <VendorStockModal vendor={openVendor} onClose={() => setOpenVendor(null)} />
      )}
    </MobileShell>
  );
}

function VendorStockModal({ vendor, onClose }: { vendor: { email: string; name: string }; onClose: () => void }) {
  useStocks();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const items = stocksStore.byVendor(vendor.email);

  return (
    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
      <div className="w-full max-h-[90vh] bg-background rounded-t-3xl border-t border-border flex flex-col">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Vendor</p>
            <p className="text-base font-bold text-foreground truncate">{vendor.name}</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-2">
          <button onClick={() => setMode("view")}
            className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              mode === "view" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}>
            <Eye className="h-3.5 w-3.5" /> View available
          </button>
          <button onClick={() => setMode("edit")}
            className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              mode === "edit" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}>
            <Edit3 className="h-3.5 w-3.5" /> Edit stocks
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          {mode === "edit" && (
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="w-full mb-3 h-11 rounded-xl bg-cta text-cta-foreground text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95">
              <Plus className="h-4 w-4" /> Add stock entry
            </button>
          )}

          {items.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-card border border-border">
              <Layers className="h-7 w-7 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">No stock entries.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((s) => (
                <div key={s.id} className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
                  {s.imageDataUrl ? (
                    <img src={s.imageDataUrl} alt={s.productType} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{s.productType}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> {s.receivedAt} · qty {s.quantity}
                    </p>
                  </div>
                  {mode === "edit" && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(s); setShowForm(true); }}
                        className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { stocksStore.remove(s.id); toast("Stock removed"); }}
                        className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <StockForm
            vendor={vendor}
            initial={editing}
            onClose={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
}

function StockForm({
  vendor, initial, onClose,
}: { vendor: { email: string; name: string }; initial: StockItem | null; onClose: () => void }) {
  const [productType, setProductType] = useState(initial?.productType ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const [receivedAt, setReceivedAt] = useState(initial?.receivedAt ?? new Date().toISOString().slice(0, 10));
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(initial?.imageDataUrl);

  const handleFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImageDataUrl(String(r.result));
    r.readAsDataURL(f);
  };

  const save = () => {
    const q = Number(quantity);
    if (!productType.trim() || !q || q < 0) { toast.error("Provide product type & quantity"); return; }
    if (initial) {
      stocksStore.update(initial.id, { productType, quantity: q, receivedAt, imageDataUrl, vendorName: vendor.name });
      toast.success("Stock updated");
    } else {
      stocksStore.add({ vendorEmail: vendor.email, vendorName: vendor.name, productType, quantity: q, receivedAt, imageDataUrl });
      toast.success("Stock added");
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end">
      <div className="w-full bg-background rounded-t-3xl border-t border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-foreground">{initial ? "Edit" : "Add"} stock</p>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Product type</label>
          <input value={productType} onChange={(e) => setProductType(e.target.value)}
            className="h-11 px-3 rounded-xl bg-input border border-border text-sm"
            placeholder="e.g. Cargo Tote" />
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">Vendor name</label>
          <input value={vendor.name} readOnly
            className="h-11 px-3 rounded-xl bg-secondary border border-border text-sm text-muted-foreground" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Received on</label>
              <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm" />
            </div>
          </div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">Image</label>
          <div className="flex items-center gap-2">
            {imageDataUrl && <img src={imageDataUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground" />
          </div>
          <button onClick={save}
            className="mt-4 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95">
            {initial ? "Save changes" : "Add stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
