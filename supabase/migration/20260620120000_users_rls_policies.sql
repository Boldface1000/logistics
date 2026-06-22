-- ============================================================================
-- Fix: public.users has no RLS policies, so once RLS is enforced every
-- SELECT (e.g. login.tsx's `.from("users")...single()`) matches 0 rows and
-- PostgREST returns 406 "Not Acceptable" even for a user reading their own row.
-- ============================================================================

-- Helper to check the caller's own role without recursive RLS evaluation.
-- SECURITY DEFINER runs as the function owner (table owner), who bypasses RLS,
-- so this avoids the "users policy queries users" infinite-recursion trap.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Every signed-in user can read their own profile row
-- (this is what login.tsx / callback.tsx / admin.tsx's own-profile check need).
CREATE POLICY "users select own" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins can read every user (needed for the pending-approvals list in admin.tsx).
CREATE POLICY "users select admin" ON public.users FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admins can update any user's record (approve/reject in admin.tsx).
CREATE POLICY "users update admin" ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
