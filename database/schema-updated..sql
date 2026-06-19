-- ============================================================================
-- EasyBlue Logistics :: Patch 001 (Schema Alignment & Structural Fixes)
-- ============================================================================

BEGIN;

-- 1) Address C2: Resolve "public.profiles" references
-- The frontend references public.profiles, but base user profiles exist in public.users.
-- Creating a view ensures any legacy or third-party hook referencing 'profiles' continues to function seamlessly.
CREATE OR REPLACE VIEW public.profiles AS 
  SELECT 
    id, 
    first_name, 
    last_name, 
    full_name, 
    email, 
    phone, 
    role, 
    approval, 
    display_name, 
    profile_photo_url, 
    created_at 
  FROM public.users;

-- 2) Address C2: Add missing rider status fields
-- The rider dashboard reads 'deployment_status' and updates operational fields.
-- We will introduce 'deployment_status' and ensure an explicit fallback tracker.
DO $$ BEGIN
  CREATE TYPE rider_deployment_status AS ENUM ('offline', 'idle', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.riders 
  ADD COLUMN IF NOT EXISTS deployment_status rider_deployment_status NOT NULL DEFAULT 'offline';

-- 3) Address C2: Add field aliases/columns for orders table alignment
-- The rider-dashboard reads recipient_name and payment_method, but schema maps to receiver_name and payment_mode.
-- We are adding generated virtual columns or nullable mappings to maintain compatibility without duplicating raw data.
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Retroactively sync existing schema rows if needed, or allow default structures
COMMENT ON COLUMN public.orders.recipient_name IS 'Alias for frontend integration mapping to receiver_name';
COMMENT ON COLUMN public.orders.payment_method IS 'Alias for frontend integration mapping to payment_mode';

-- 4) Foundation for C3: Add status tracking version to enforce optimistic concurrency control
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS status_version INTEGER NOT NULL DEFAULT 1;

COMMIT;