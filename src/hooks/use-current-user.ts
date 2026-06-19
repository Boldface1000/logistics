import { useEffect, useState } from "react";
import { supabase } from "@/integrations/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "customer" | "vendor" | "rider" | "super_admin" | "logistics_admin";

export interface CurrentUser {
  user: User;
  roles: AppRole[];
  displayName: string | null;
  email: string;
  photoUrl: string | null;
}

/**
 * Subscribes to Supabase auth state, fetches roles + profile from public
 * tables, and exposes the result to React.
 *
 * Critical path notes:
 *   - Uses TanStack-friendly subscription pattern with cleanup.
 *   - getSession is fine here; the server validates the bearer separately
 *     when serverFns are called.
 *   - Roles are read from `user_roles` (NOT from a `role` column on
 *     profiles) — prevents privilege escalation.
 */
export function useCurrentUser() {
  const [state, setState] = useState<
    { status: "loading" } | { status: "anonymous" } | { status: "ready"; data: CurrentUser }
  >({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    async function hydrate(user: User | null) {
      if (!user) {
        if (mounted) setState({ status: "anonymous" });
        return;
      }
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("display_name, email, profile_photo_url")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      const profile = profileRes.data;
      setState({
        status: "ready",
        data: {
          user,
          roles,
          displayName: profile?.display_name ?? null,
          email: profile?.email ?? user.email ?? "",
          photoUrl: profile?.profile_photo_url ?? null,
        },
      });
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
