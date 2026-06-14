/**
 * Protected route layout.
 *
 * Any route file placed under `src/routes/_authenticated/` (or named with
 * the `_authenticated.*` dot-prefix) renders inside this gate. The gate:
 *
 *   1. Runs `ssr: false` because Supabase persists the session in
 *      `localStorage`, which the server cannot read. Gating server-side
 *      would loop on hard refresh.
 *   2. Calls `supabase.auth.getUser()` in `beforeLoad` and redirects to
 *      `/login` (preserving the originally requested URL via the
 *      `redirect` search param) when there is no authenticated user.
 *   3. Hydrates roles + profile from public tables and exposes the
 *      result to child routes via route context as `auth`. Children
 *      can read it with `Route.useRouteContext().auth` instead of
 *      re-querying Supabase.
 */
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/client";
import type { AppRole, Profile } from "@/types/database.types";

export interface AuthContext {
  userId: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }): Promise<{ auth: AuthContext }> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    const user = data.user;

    // Pull roles + profile in parallel. RLS scopes both to the current user
    // (or returns admin-visible rows for admins).
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    const roles: AppRole[] = (rolesRes.data ?? []).map((r) => r.role as AppRole) ?? [];
    const profile: Profile | null = profileRes.data ?? null;

    const auth: AuthContext = {
      userId: user.id,
      email: profile?.email ?? user.email ?? "",
      profile,
      roles,
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (needed) => needed.some((r) => roles.includes(r)),
    };

    return { auth };
  },
  component: () => <Outlet />,
});
