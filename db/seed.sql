-- ============================================================================
-- EasyBlue Logistics :: Seed Data
-- ============================================================================
BEGIN;

-- Users
-- Users (customers, vendor, rider, and split admins)
INSERT INTO users (id, first_name, last_name, email, phone, role, password_hash, is_verified, agreed_terms, approval)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Efe',     'Udumebraye','eferideogheneudumebraye@gmail.com', '+2347082335454', 'customer', 'demo:781227',  TRUE, TRUE, 'approved'),
  ('22222222-2222-2222-2222-222222222222', 'Vitafruity', 'Vendor', 'demood@gmail.com',                '+2348010000002', 'vendor', 'demo:781227',  TRUE, TRUE, 'approved'),
  ('33333333-3333-3333-3333-333333333333', 'Mr Victor', 'Rider',     'victor@gmail.com',                 '+2348010000003', 'rider', 'demo:781227',  TRUE, TRUE, 'approved'),
  
  ('a0000001-0000-0000-0000-000000000001', 'Super',      'Admin',     'easybluelogistics@gmail.com',           '+2348020000001', 'admin', 'demo:legacyblue94', TRUE, TRUE, 'approved'),
  ('a0000002-0000-0000-0000-000000000002', 'Operations', 'Admin',     'easybluelogisticsoperations@gmail.com',   '+2348020000002', 'admin', 'demo:ebladmin', TRUE, TRUE, 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_profiles (user_id, scope) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'super'),
  ('a0000002-0000-0000-0000-000000000002', 'operations')
ON CONFLICT (user_id) DO NOTHING;

-- Vendor + products
INSERT INTO vendors (id, user_id, registered_business_name, business_phone, rating, approval) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'vita fruity', '+2348010000002', 4.80, 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (vendor_id, name, description, price_cents, partner_price_cents, stock) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cargo Tote',  'Heavy-duty courier tote',  1500000, 1200000, 25),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Helmet Pro',  'DOT-rated rider helmet',    2200000, 1850000, 12),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Parcel Tape', '50m heavy adhesive tape',    180000,  150000, 200);

-- Rider
INSERT INTO riders (id, user_id, vehicle_type, plate_number, has_license, is_experienced, is_available, current_lat, current_lng, approval) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'motorcycle', 'EB-001-LG', TRUE, TRUE, TRUE, 6.524379, 3.379206, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Sample drop
INSERT INTO item_drops (reference_code, description, dropper_name, assigned_rider, status) VALUES
  ('DROP-0001', 'Sealed A4 envelope to Yaba', 'Walk-in Customer', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'assigned')
ON CONFLICT (reference_code) DO NOTHING;

COMMIT;
