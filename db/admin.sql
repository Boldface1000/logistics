BEGIN;

UPDATE public.users
SET 
  role = 'admin'::user_role,
  approval = 'approved'::approval_status
WHERE id = 'SUPER-ADMIN-UUID';

-- Injected into auth metadata to make it instantly accessible on session read
UPDATE auth.users
SET raw_user_meta_data = 
  coalesce(raw_user_meta_data, '{}'::jsonb) || by
  jsonb_build_object(
    'role', 'admin',
    'admin_scope', 'super',
    'is_approved', true
  )
WHERE id = 'SUPER-ADMIN-UUID';

COMMIT;