/**
 * Protected route layout (_authenticated).
 *
 * This layout ensures that only authenticated users can access child routes.
 * It also hydrates the user's profile and roles into the route context.
 */
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/client";

// Define the shape of our authentication context
export interface AuthContext {
  userId: string;
  email: string;
  profile: Record<string, unknown> | null;
  role: string;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    // Fetch the unified profile from the profiles view
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    const role = profile?.role ?? "customer";
    const approval = (profile as { approval?: string } | null)?.approval;

    // Vendors and riders must be approved before they can reach any protected
    // dashboard route. Pending users are sent back to the waiting room;
    // rejected users are signed out and sent back with their status so they
    // can't linger on a stale session and poke at dashboard URLs directly.
    if ((role === "vendor" || role === "rider") && approval !== "approved") {
      if (approval === "rejected") {
        await supabase.auth.signOut();
      }
      throw redirect({
        to: "/pending-approval",
        search: { role: role === "vendor" ? "partner" : "rider" },
      });
    }

    const auth: AuthContext = {
      userId: session.user.id,
      email: profile?.email ?? session.user.email ?? "",
      profile: profile,
      role,
    };

    return { auth };
  },
  component: () => <Outlet />,
});
