-- ============================================================================
-- EasyBlue Logistics :: Schema
-- PostgreSQL 14+
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- Enums -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'rider', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_scope AS ENUM ('super', 'logistics');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM (
    'pending', 'assigned', 'accepted', 'declined', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('marketplace', 'waybill', 'standard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rider_response AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE drop_status AS ENUM ('registered', 'assigned', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('transfer', 'cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- Users -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (

  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  full_name     TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT UNIQUE NOT NULL, -- required for all signups (customer/partner/rider) — used for OTP & contact
  role          user_role NOT NULL DEFAULT 'customer',
  password_hash TEXT NOT NULL,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  remember_me   BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_terms  BOOLEAN NOT NULL DEFAULT FALSE,
  approval      approval_status NOT NULL DEFAULT 'approved',
  display_name      TEXT,                -- user-editable nickname shown in dashboards (NULL = use first_name + last_name)
  profile_photo_url TEXT,                -- avatar URL or data URI uploaded from the profile bubble
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_approval ON users(approval);

CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  scope    admin_scope NOT NULL
);

-- ---- OTP -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

-- ---- Vendors / Riders ------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_business_name TEXT NOT NULL,
  business_phone         TEXT NOT NULL,
  rating                 NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  approval               approval_status NOT NULL DEFAULT 'pending',
  approved_at            TIMESTAMPTZ,
  approved_by            UUID REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendors_approval ON vendors(approval);

CREATE TABLE IF NOT EXISTS riders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type    TEXT,
  plate_number    TEXT,
  has_license     BOOLEAN NOT NULL DEFAULT FALSE,
  is_experienced  BOOLEAN NOT NULL DEFAULT FALSE,
  nin             TEXT,           -- 11-digit National Identification Number
  nin_photo_url   TEXT,           -- uploaded NIN proof image (URL or data URI)
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  current_lat     NUMERIC(9,6),
  current_lng     NUMERIC(9,6),
  approval        approval_status NOT NULL DEFAULT 'pending',
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_riders_approval ON riders(approval);

-- ---- Products / Inventory --------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  partner_price_cents INTEGER CHECK (partner_price_cents >= 0),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);

-- ---- Orders / Shipments ----------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES users(id),
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider ON orders(assigned_rider_id);

CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE TABLE IF NOT EXISTS shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id        UUID REFERENCES riders(id),
  origin_lat      NUMERIC(9,6) NOT NULL,
  origin_lng      NUMERIC(9,6) NOT NULL,
  dest_lat        NUMERIC(9,6) NOT NULL,
  dest_lng        NUMERIC(9,6) NOT NULL,
  status          shipment_status NOT NULL DEFAULT 'pending',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id          BIGSERIAL PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  lat         NUMERIC(9,6) NOT NULL,
  lng         NUMERIC(9,6) NOT NULL,
  speed_kph   NUMERIC(5,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_shipment ON telemetry_events(shipment_id, recorded_at DESC);

-- ---- Local Item Drops (Records Admin) --------------------------------------
CREATE TABLE IF NOT EXISTS item_drops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code  TEXT UNIQUE NOT NULL,
  description     TEXT NOT NULL,
  dropper_name    TEXT NOT NULL,
  assigned_rider  UUID REFERENCES riders(id),
  status          drop_status NOT NULL DEFAULT 'registered',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ---- Vendor Stocks (managed by Product Admin) ------------------------------
-- Only Super Admin can approve a vendor; once approved, Product Admin can
-- CRUD entries in this table per vendor. Each vendor sees their own rows
-- (read-only) in their dashboard's Stocks section in real time.
CREATE TABLE IF NOT EXISTS vendor_stocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_type    TEXT NOT NULL,
  image_url       TEXT,
  quantity        INTEGER NOT NULL CHECK (quantity >= 0),
  received_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendor_stocks_vendor ON vendor_stocks(vendor_id);

COMMIT;
