import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/client";
import { toast } from "sonner";

export const Route = createFileRoute("/callback")({
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session in auth callback:", sessionError);
      toast.error("Authentication error", { description: sessionError.message });
      throw redirect({ to: "/login" });
    }

    if (session) {
      // Use the unified profiles view created in Patch 001
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role, approval")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile in auth callback:", profileError);
        toast.error("Profile lookup error", { description: profileError.message });
        await supabase.auth.signOut();
        throw redirect({ to: "/login" });
      }

      // Handle account approval flows
      if (profile.approval === "pending" || profile.approval === "rejected") {
        throw redirect({
          to: "/pending-approval",
          search: { role: profile.role } as any,
        });
      }

      // Routing distribution matrix based on user role
      if (profile.role === "admin") throw redirect({ to: "/admin" });
      if (profile.role === "vendor") throw redirect({ to: "/vendor-dashboard" });
      if (profile.role === "rider") throw redirect({ to: "/rider-dashboard" });
      throw redirect({ to: "/dashboard" });
    } else {
      console.log("No session found after auth callback, redirecting to login.");
      throw redirect({ to: "/login" });
    }
  },
  component: () => {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Processing authentication...</p>
      </div>
    );
  },
});
