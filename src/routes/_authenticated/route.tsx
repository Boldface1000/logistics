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
  beforeLoad: async ({ location }): Promise<{ auth: AuthContext }> => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    const user = data.user;

    // Fetch the unified profile from the profiles view
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const auth: AuthContext = {
      userId: user.id,
      email: profile?.email ?? user.email ?? "",
      profile: profile,
      role: profile?.role ?? "customer",
    };

    return { auth };
  },
  component: () => <Outlet />,
});
