import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/client";
import { toast } from "sonner";

export const Route = createFileRoute("/callback")({
  // SSR off: beforeLoad reads window.location.search directly, which throws on
  // the server, and resolves the session via the browser-only Supabase client.
  ssr: false,
  beforeLoad: async () => {
    // FIX: Exchange PKCE code for session before calling getSession.
    // Supabase email confirmation links carry a ?code= param (PKCE flow).
    // Without this exchange, getSession() always returns null.
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Code exchange failed:", exchangeError.message);
        toast.error("Confirmation failed", { description: exchangeError.message });
        throw redirect({ to: "/login" });
      }
    }

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

      if (profile.approval === "pending" || profile.approval === "rejected") {
        throw redirect({
          to: "/pending-approval",
          // FIX: map "vendor" role to "partner" for pending-approval search param
          search: { role: profile.role === "vendor" ? "partner" : profile.role } as any,
        });
      }

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
