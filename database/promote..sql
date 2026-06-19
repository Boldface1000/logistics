-- 1) Upgrade the Super Admin account
BEGIN;
UPDATE public.users SET role = 'admin'::user_role, approval = 'approved'::approval_status WHERE id = 'YOUR-REAL-SUPER-ADMIN-UUID';
UPDATE auth.users SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin', 'admin_scope', 'super', 'is_approved', true) WHERE id = 'YOUR-REAL-SUPER-ADMIN-UUID';
COMMIT;

-- 2) Upgrade the Logistics Admin account
BEGIN;
UPDATE public.users SET role = 'admin'::user_role, approval = 'approved'::approval_status WHERE id = 'YOUR-REAL-LOGISTICS-ADMIN-UUID';
UPDATE auth.users SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin', 'admin_scope', 'logistics', 'is_approved', true) WHERE id = 'YOUR-REAL-LOGISTICS-ADMIN-UUID';
COMMIT;