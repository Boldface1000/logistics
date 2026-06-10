/**
 * Placeholder protected route at `/me` so the `_authenticated` pathless
 * layout is registered by the TanStack Router file-based plugin. Replace
 * or delete once real protected pages (e.g. `_authenticated/dashboard.tsx`)
 * are migrated in during the local VS Code rebuild.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/me")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
