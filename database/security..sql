-- ============================================================================
-- EasyBlue Logistics :: Security & Triggers Setup
-- PostgreSQL / Supabase
-- ============================================================================

BEGIN;

-- 1) Create or update the auto-provisioning function
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Cast meta_data string into the user_role enum safely
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role);

  -- 1. Insert base profile into public.users matching schema.sql columns
  INSERT INTO public.users (
    id, 
    first_name, 
    last_name, 
    email, 
    phone, 
    role, 
    password_hash, -- required by schema.sql constraint
    approval
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number', ''), -- maps incoming metadata to 'phone'
    v_role,
    'SUPABASE_AUTH_MANAGED', -- placeholder required text to satisfy NOT NULL condition
    CASE WHEN v_role = 'customer' THEN 'approved'::approval_status ELSE 'pending'::approval_status END
  );

  -- 2. Provision custom role tables conditionally based on user_role types
  IF v_role = 'vendor'::user_role THEN
    INSERT INTO public.vendors (
      id, 
      user_id, 
      registered_business_name, 
      business_phone, 
      approval
    )
    VALUES (
      gen_random_uuid(), 
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'business_name', 'Unnamed Business'),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'business_phone', ''),
      'pending'::approval_status
);

  ELSIF v_role = 'rider'::user_role THEN
    INSERT INTO public.riders (
      id, 
      user_id, 
      vehicle_type, 
      approval
    )
    VALUES (
      gen_random_uuid(), 
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Unknown'),
      'pending'::approval_status
);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Bind the trigger to Supabase's internal auth table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- 3) Row Level Security for public.users
-- Without this, RLS blocks every SELECT (including a user reading their own
-- row right after sign-in), which PostgREST surfaces as a 406 on `.single()`.
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

DROP POLICY IF EXISTS "users select own" ON public.users;
CREATE POLICY "users select own" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users select admin" ON public.users;
CREATE POLICY "users select admin" ON public.users FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "users update admin" ON public.users;
CREATE POLICY "users update admin" ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;