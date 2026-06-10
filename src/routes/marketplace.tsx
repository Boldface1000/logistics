import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plane, ArrowRight, MousePointer2, ShoppingBag, Tv, Boxes, Briefcase, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader, useArtificialLoading } from "@/components/PageLoader";
import { auth } from "@/lib/auth";
import { ordersStore } from "@/lib/orders-store";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — EasyBlue" }] }),
  component: MarketplacePage,
});

interface Product { id: string; name: string; category: string; price: number; partnerPrice: number; icon: React.ReactNode; }

const PRODUCTS: Product[] = [
  { id: "p1", name: "Pro Stand Mixer",    category: "Appliances",  price: 549, partnerPrice: 449, icon: <Boxes className="h-7 w-7" /> },
  { id: "p2", name: "Leather Tote",       category: "Bags",        price: 320, partnerPrice: 269, icon: <Briefcase className="h-7 w-7" /> },
  { id: "p3", name: "4K Smart TV 55\"",   category: "Electronics", price: 899, partnerPrice: 749, icon: <Tv className="h-7 w-7" /> },
  { id: "p4", name: "Wireless Earbuds",   category: "Electronics", price: 199, partnerPrice: 149, icon: <Smartphone className="h-7 w-7" /> },
  { id: "p5", name: "Weekend Duffel",     category: "Bags",        price: 180, partnerPrice: 139, icon: <ShoppingBag className="h-7 w-7" /> },
  { id: "p6", name: "Air Fryer XL",       category: "Appliances",  price: 220, partnerPrice: 179, icon: <Boxes className="h-7 w-7" /> },
];

function MarketplacePage() {
  const loading = useArtificialLoading(450);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const order = (p: Product) => {
    const user = auth.current();
    if (!user) { toast.error("Please sign in first"); navigate({ to: "/login" }); return; }
    setBusy(p.id);
    setTimeout(() => {
      const o = ordersStore.create({
        type: "marketplace",
        customerEmail: user.email,
        customerFirstName: user.firstName,
        customerLastName: user.lastName,
        customerPhone: user.phone ?? "",
        pickup: "EasyBlue Hub · Lagos",
        dropoff: "Customer registered address",
        itemDescription: `${p.name} (${p.category})`,
        priceCents: p.partnerPrice * 100,
      });
      toast.success("Order placed", { description: `Reference ${o.id} — records desk notified.` });
      setBusy(null);
      navigate({ to: backTarget() });
    }, 500);
  };

  if (loading) return <MobileShell><PageLoader label="Marketplace" /></MobileShell>;

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-3 flex items-center gap-3 border-b border-border">
        <Link to={backTarget()} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Marketplace</h1>
          <p className="text-xs text-muted-foreground">Partner pricing on every item</p>
        </div>
        <Plane className="h-5 w-5 text-primary" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6 scrollbar-hide">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card border border-border p-3">
              <div className="h-24 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-primary mb-2">
                {p.icon}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</p>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xs line-through text-muted-foreground">${p.price}</span>
                <span className="text-sm font-bold text-cta">${p.partnerPrice}</span>
              </div>
              <button
                onClick={() => order(p)}
                disabled={busy === p.id}
                className="mt-2 w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-60"
              >
                {busy === p.id ? "Placing…" : (<>Order <ArrowRight className="h-3.5 w-3.5" /> <MousePointer2 className="h-3.5 w-3.5" /></>)}
              </button>
            </div>
          ))}
        </div>
      </main>
    </MobileShell>
  );
}

function backTarget(): "/dashboard" | "/vendor-dashboard" {
  const u = auth.current();
  return u?.role === "vendor" ? "/vendor-dashboard" : "/dashboard";
}
