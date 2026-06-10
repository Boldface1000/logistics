import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";

type SearchParams = { role?: "partner" | "rider" };

export const Route = createFileRoute("/pending-approval")({
  head: () => ({ meta: [{ title: "Pending Approval — EasyBlue" }] }),
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    role: search.role === "rider" || search.role === "partner" ? search.role : undefined,
  }),
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const { role } = Route.useSearch();
  const label = role === "rider" ? "Rider" : role === "partner" ? "Partner" : "Account";

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-4 flex items-center gap-3 border-b border-border">
        <Link to="/" className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Pending Approval</h1>
          <p className="text-xs text-muted-foreground">{label} verification</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-hide flex flex-col items-center text-center pt-10">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-cta/10 text-cta flex items-center justify-center mb-6 shadow-lg shadow-cta/20">
            <Clock className="h-12 w-12" />
          </div>
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-cta animate-pulse ring-4 ring-background" />
        </div>

        <h2 className="text-2xl font-bold text-foreground">Application received</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          Your {label.toLowerCase()} account is now under review by our compliance team. You'll get an email once it's approved — typically within 24 hours.
        </p>

        <div className="w-full mt-8 flex flex-col gap-2.5">
          <StatusRow icon={<ShieldCheck className="h-4 w-4" />} label="Identity submitted" done />
          <StatusRow icon={<Clock className="h-4 w-4" />} label="Compliance review" active />
          <StatusRow icon={<Mail className="h-4 w-4" />} label="Email confirmation" />
        </div>

        <div className="w-full mt-8 p-4 rounded-2xl bg-secondary/60 border border-border text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">What's next?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Keep an eye on <span className="text-foreground font-medium">your inbox</span>. Once approved, you can sign in and access your {label.toLowerCase()} dashboard.
          </p>
        </div>
      </main>

      <footer className="safe-bottom px-5 pt-3 border-t border-border bg-card">
        <Link
          to="/"
          className="block w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base text-center active:scale-[0.98] transition shadow-lg shadow-primary/20"
        >
          Back to home
        </Link>
      </footer>
    </MobileShell>
  );
}

function StatusRow({ icon, label, done, active }: { icon: React.ReactNode; label: string; done?: boolean; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        done
          ? "bg-success/10 border-success/30 text-success"
          : active
            ? "bg-cta/10 border-cta/30 text-cta"
            : "bg-card border-border text-muted-foreground"
      }`}
    >
      <div className="h-8 w-8 rounded-lg bg-card/60 flex items-center justify-center">{icon}</div>
      <p className="text-sm font-semibold flex-1 text-left">{label}</p>
      {done && <span className="text-[10px] font-bold">DONE</span>}
      {active && <span className="text-[10px] font-bold animate-pulse">REVIEWING</span>}
    </div>
  );
}
