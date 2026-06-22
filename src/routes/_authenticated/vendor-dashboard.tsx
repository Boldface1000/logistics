import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CustomerDashboard } from "./dashboard";
import { supabase } from "@/integrations/client";
import { MobileShell } from "@/components/MobileShell";
import { PageLoader } from "@/components/PageLoader";

export const Route = createFileRoute("/_authenticated/vendor-dashboard")({
  head: () => ({ meta: [{ title: "Vendor Dashboard — EasyBlue" }] }),
  component: VendorDashboardRoute,
});

function VendorDashboardRoute() {
  const navigate = useNavigate();

  // 1. Fetch current active database session
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["vendor-route-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  const userId = sessionData?.user?.id;

  // 2. Query the exact verification status for this partner node
  const { data: vendorProfile, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor-route-verification", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("approval")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Guard Clause: Display standard app page loader while checks resolve
  if (sessionLoading || vendorLoading) {
    return (
      <MobileShell>
        <PageLoader label="Authenticating Secure Node..." />
      </MobileShell>
    );
  }

  // Guard Clause: Session gate-keeper fallback
  if (!sessionData) {
    navigate({ to: "/auth" });
    return null;
  }

  // Guard Clause: Push to pending registration page if not approved
  if (!vendorProfile || vendorProfile.approval !== "approved") {
    navigate({ to: "/pending-approval", search: { role: "partner" } });
    return null;
  }

  // Render the functional dashboard variant once validation completes
  return <CustomerDashboard variant="vendor" />;
}
