BEGIN;

UPDATE public.users
SET 
  role = 'admin'::user_role,
  approval = 'approved'::approval_status
WHERE id = 'LOGISTICS-ADMIN-UUID';

UPDATE auth.users
SET raw_user_meta_data = 
  coalesce(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', 'admin',
    'admin_scope', 'logistics',
    'is_approved', true
  )
WHERE id = 'LOGISTICS-ADMIN-UUID';

COMMIT;