import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ShieldCheck, Mail, ArrowLeft, LogOut } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader } from "@/components/PageLoader";
import { supabase } from "@/integrations/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type SearchParams = { role?: "partner" | "rider" | "vendor" };

export const Route = createFileRoute("/pending-approval")({
  head: () => ({ meta: [{ title: "Pending Approval — EasyBlue" }] }),
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    role:
      search.role === "rider" || search.role === "partner" || search.role === "vendor"
        ? (search.role as SearchParams["role"])
        : undefined,
  }),
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const { role } = Route.useSearch();
  const navigate = useNavigate();
  const label = role === "rider" ? "Rider" : role === "partner" ? "Partner" : "Account";
  const [isSignOutPending, setIsSignOutPending] = useState(false);

  // 1. Fetch current active session ID safely
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["pending-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  const userId = sessionData?.user?.id;

  // 2. Branch DB logic conditionally based on user role to determine approval state
  const { data: profileRecord, isLoading: profileLoading } = useQuery({
    queryKey: ["pending-profile-record", userId, role],
    enabled: !!userId && !!role,
    refetchInterval: 5000,
    queryFn: async () => {
      if (!userId || !role) return null;
      if (role === "rider") {
        const { data, error } = await supabase
          .from("riders")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    },
  });

  const handleSignOut = async () => {
    setIsSignOutPending(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Session closed safely");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error("Failed to cleanly disconnect session context");
    } finally {
      setIsSignOutPending(false);
    }
  };

  const approvalStatus = profileRecord?.approval ?? "pending";

  // React to status changes live: approved users get sent straight to their
  // dashboard, rejected users are signed out immediately so a lingering
  // session can't be used to poke at protected routes.
  useEffect(() => {
    if (!profileRecord) return;

    if (approvalStatus === "approved") {
      toast.success("Account approved — redirecting…");
      navigate({ to: role === "rider" ? "/rider-dashboard" : "/vendor-dashboard" });
      return;
    }

    if (approvalStatus === "rejected") {
      supabase.auth.signOut().finally(() => {
        toast.error("Registration was not approved", {
          description: "Your account request was declined by an administrator.",
        });
      });
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [approvalStatus, profileRecord]);

  if (sessionLoading || profileLoading) {
    return (
      <MobileShell>
        <PageLoader label={`Verifying ${label} Credentials...`} />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="safe-top px-5 pb-3 flex items-center gap-3 border-b border-border">
        <Link
          to="/"
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-foreground">Verification Node</h1>
          <p className="text-xs text-muted-foreground">{label} Account Status</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card border border-border text-center space-y-3">
            <div
              className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center ${
                approvalStatus === "rejected"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-cta/10 text-cta animate-pulse"
              }`}
            >
              <Clock className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {approvalStatus === "rejected" ? "Application Declined" : "Screening in Progress"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                {approvalStatus === "rejected"
                  ? `Your ${label.toLowerCase()} application was reviewed and was not approved. You've been signed out. Please contact support if you believe this is a mistake.`
                  : `Your ${label.toLowerCase()} application is undergoing administrative policy audits. Operations will establish authorization parameters shortly.`}
              </p>
            </div>
          </div>

          {approvalStatus !== "rejected" && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Onboarding Checklist
              </h3>
              <StatusRow
                icon={<Mail className="h-4 w-4" />}
                label="Digital Identity Index Created"
                done={true}
              />
              <StatusRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Operations Clearance Review"
                done={approvalStatus === "approved"}
                active={approvalStatus === "pending"}
              />
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          disabled={isSignOutPending}
          className="w-full mt-6 p-4 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center gap-3 active:scale-[0.99] font-semibold text-sm border border-destructive/10 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          {isSignOutPending ? "Disconnecting..." : "Sign Out from Session"}
        </button>
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

function StatusRow({
  icon,
  label,
  done,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        done
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
          : active
            ? "bg-cta/10 border-cta/30 text-cta"
            : "bg-card border-border text-muted-foreground"
      }`}
    >
      <div className="h-8 w-8 rounded-lg bg-card/60 flex items-center justify-center border border-border/40">
        {icon}
      </div>
      <span className="text-xs font-semibold flex-1">{label}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-card/80 border border-border/40">
        {done ? "Done" : active ? "Active" : "Wait"}
      </span>
    </div>
  );
}
