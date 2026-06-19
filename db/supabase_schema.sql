-- Comprehensive Supabase Schema

-- 1. Enums
-- Reconcile existing enums and add new ones as needed.
-- The `app_role` enum is crucial for the new role-based access control.
CREATE TYPE public.app_role AS ENUM (
    'customer',
    'vendor',
    'rider',
    'admin',
    'super_admin',
    'logistics_admin'
);

CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.drop_status AS ENUM ('registered', 'assigned', 'completed');
CREATE TYPE public.order_type AS ENUM ('marketplace', 'waybill', 'standard');
CREATE TYPE public.payment_mode AS ENUM ('transfer', 'cash');
CREATE TYPE public.rider_deployment_status AS ENUM ('offline', 'idle', 'active');
CREATE TYPE public.rider_response AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.shipment_status AS ENUM (
    'pending',
    'assigned',
    'accepted',
    'declined',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'cancelled'
);

-- 2. Profiles Table (User Metadata)
-- This table stores additional user information and links to auth.users.
-- It also includes the `disabled_at` column for soft-deletion.
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    profile_photo_url TEXT,
    display_name TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    agreed_terms BOOLEAN DEFAULT FALSE,
    approval public.approval_status DEFAULT 'pending'::public.approval_status,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    disabled_at TIMESTAMPTZ -- For soft-deleting users
);

-- Set up Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. User Roles Table
-- This table maps users to multiple roles, allowing for flexible role management.
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- Set up RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User roles are viewable by authenticated users." ON public.user_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage user roles." ON public.user_roles FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 4. Vendors Table
-- Dedicated table for vendor-specific information.
CREATE TABLE public.vendors (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    registered_business_name TEXT NOT NULL,
    business_phone TEXT NOT NULL,
    rating NUMERIC DEFAULT 0,
    approval public.approval_status DEFAULT 'pending'::public.approval_status,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors are viewable by everyone." ON public.vendors FOR SELECT USING (TRUE);
CREATE POLICY "Vendors can insert their own vendor profile." ON public.vendors FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Vendors can update their own vendor profile." ON public.vendors FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage vendor profiles." ON public.vendors FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 5. Riders Table
-- Dedicated table for rider-specific information.
CREATE TABLE public.riders (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    has_license BOOLEAN DEFAULT FALSE,
    is_experienced BOOLEAN DEFAULT FALSE,
    nin TEXT UNIQUE,
    nin_photo_url TEXT,
    vehicle_type TEXT,
    current_lat NUMERIC,
    current_lng NUMERIC,
    deployment_status public.rider_deployment_status DEFAULT 'offline'::public.rider_deployment_status,
    approval public.approval_status DEFAULT 'pending'::public.approval_status,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for riders
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders are viewable by everyone." ON public.riders FOR SELECT USING (TRUE);
CREATE POLICY "Riders can insert their own rider profile." ON public.riders FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Riders can update their own rider profile." ON public.riders FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage rider profiles." ON public.riders FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 6. Products Table (Marketplace Items)
-- This table stores information about products offered in the marketplace.
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price_cents INTEGER NOT NULL,
    partner_price_cents INTEGER,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone." ON public.products FOR SELECT USING (TRUE);
CREATE POLICY "Vendors can manage their own products." ON public.products FOR ALL USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Admins can manage all products." ON public.products FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 7. Orders Table
-- This table stores general order information.
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assigned_rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, -- For marketplace orders
    order_type public.order_type NOT NULL,
    status public.shipment_status DEFAULT 'pending'::public.shipment_status NOT NULL,
    status_version INTEGER DEFAULT 1 NOT NULL,
    payment_mode public.payment_mode NOT NULL,
    total_cents INTEGER,
    amount_to_be_paid TEXT, -- This should ideally be numeric, but keeping as TEXT for now based on existing schema
    item_description TEXT NOT NULL,
    sender_name TEXT,
    sender_phone TEXT,
    sender_location TEXT,
    receiver_name TEXT,
    receiver_phone TEXT,
    receiver_location TEXT,
    pickup TEXT,
    dropoff TEXT,
    name_on_parcel TEXT,
    phone_number_on_parcel TEXT,
    park_name TEXT,
    receiver_name_park TEXT,
    drop_off_point TEXT,
    drop_off_number TEXT,
    contact_number TEXT,
    content_of_item TEXT,
    driver_or_storekeeper_number TEXT,
    delivery_code TEXT,
    waybill TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own orders." ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Riders can view assigned orders." ON public.orders FOR SELECT USING (auth.uid() = assigned_rider_id);
CREATE POLICY "Vendors can view their marketplace orders." ON public.orders FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Admins can view all orders." ON public.orders FOR SELECT USING (current_user_is_admin());
CREATE POLICY "Customers can insert their own orders." ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update their own pending orders." ON public.orders FOR UPDATE USING (auth.uid() = customer_id AND status = 'pending');
CREATE POLICY "Riders can update assigned orders." ON public.orders FOR UPDATE USING (auth.uid() = assigned_rider_id);
CREATE POLICY "Admins can update all orders." ON public.orders FOR UPDATE USING (current_user_is_admin());

-- 8. Order Items Table
-- This table stores individual items within an order (for marketplace orders).
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items are viewable by order owner, rider, and admin." ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.assigned_rider_id = auth.uid())
    OR current_user_is_admin()
);

-- 9. Vendor Stocks Table
-- This table tracks stock levels for vendor products.
CREATE TABLE public.vendor_stocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL,
    received_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Set up RLS for vendor_stocks
ALTER TABLE public.vendor_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage their own stock." ON public.vendor_stocks FOR ALL USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Admins can manage all stock." ON public.vendor_stocks FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 10. Chat/Support Messages Table
-- This table is already present in the migration, ensuring consistency.
-- The RLS policies are also defined in the migration, but we'll include the table definition here for completeness.
CREATE TABLE public.support_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_support_messages_conv ON public.support_messages(conversation_user_id, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_messages (as per existing migration)
CREATE POLICY "support read own or admin"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (
    conversation_user_id = auth.uid()
    OR current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role])
  );

CREATE POLICY "support insert own or admin"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (sender_is_admin = FALSE AND conversation_user_id = auth.uid())
      OR (sender_is_admin = TRUE AND current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role]))
    )
  );

CREATE POLICY "support update read receipts"
  ON public.support_messages FOR UPDATE
  TO authenticated
  USING (
    conversation_user_id = auth.uid()
    OR current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role])
  )
  WITH CHECK (
    conversation_user_id = auth.uid()
    OR current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role])
  );

-- 11. Forgot Password Tokens Table
-- For handling password reset requests.
CREATE TABLE public.forgot_password_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for forgot_password_tokens
ALTER TABLE public.forgot_password_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only user can use their own token" ON public.forgot_password_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only user can delete their own token" ON public.forgot_password_tokens FOR DELETE USING (auth.uid() = user_id);

-- 12. Helper Functions for RLS
-- Function to check if the current user has any of the specified roles.
CREATE OR REPLACE FUNCTION public.current_user_has_any_role(roles public.app_role[])
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY(roles)
  );
END;
$$;

-- Function to check if the current user is an admin (super_admin or logistics_admin).
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public.current_user_has_any_role(ARRAY['super_admin'::public.app_role, 'logistics_admin'::public.app_role]);
END;
$$;

-- 13. Triggers
-- Automatically create a profile and assign a default role on new user signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');

  -- Assign default role 'customer' if not specified
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.app_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update `updated_at` column automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_riders_updated_at
BEFORE UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vendor_stocks_updated_at
BEFORE UPDATE ON public.vendor_stocks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 14. Functions for creating orders (from existing schema, adapted)
-- create_db_order function
CREATE OR REPLACE FUNCTION public.create_db_order(
    p_customer_id UUID,
    p_item_description TEXT,
    p_payment_mode public.payment_mode,
    p_receiver_location TEXT,
    p_receiver_name TEXT,
    p_receiver_phone TEXT,
    p_sender_location TEXT,
    p_sender_name TEXT,
    p_sender_phone TEXT,
    p_amount_to_be_paid TEXT DEFAULT NULL,
    p_contact_number TEXT DEFAULT NULL,
    p_content_of_item TEXT DEFAULT NULL,
    p_driver_or_storekeeper_number TEXT DEFAULT NULL,
    p_drop_off_point TEXT DEFAULT NULL,
    p_park_name TEXT DEFAULT NULL,
    p_total_cents INTEGER DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    new_order_id UUID;
BEGIN
    INSERT INTO public.orders (
        customer_id,
        item_description,
        payment_mode,
        receiver_location,
        receiver_name,
        receiver_phone,
        sender_location,
        sender_name,
        sender_phone,
        amount_to_be_paid,
        contact_number,
        content_of_item,
        driver_or_storekeeper_number,
        drop_off_point,
        park_name,
        total_cents,
        order_type
    )
    VALUES (
        p_customer_id,
        p_item_description,
        p_payment_mode,
        p_receiver_location,
        p_receiver_name,
        p_receiver_phone,
        p_sender_location,
        p_sender_name,
        p_sender_phone,
        p_amount_to_be_paid,
        p_contact_number,
        p_content_of_item,
        p_driver_or_storekeeper_number,
        p_drop_off_point,
        p_park_name,
        p_total_cents,
        'standard'::public.order_type
    )
    RETURNING id INTO new_order_id;

    RETURN new_order_id;
END;
$$;

-- create_marketplace_order function
CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_customer_id UUID,
    p_vendor_id UUID,
    p_product_id UUID,
    p_purchase_quantity INTEGER,
    p_payment_mode public.payment_mode,
    p_receiver_location TEXT,
    p_receiver_name TEXT,
    p_receiver_phone TEXT,
    p_sender_location TEXT,
    p_sender_name TEXT,
    p_sender_phone TEXT,
    p_total_cents INTEGER
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    new_order_id UUID;
    v_product_name TEXT;
    v_unit_price_cents INTEGER;
BEGIN
    -- Get product details
    SELECT name, price_cents INTO v_product_name, v_unit_price_cents
    FROM public.products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    -- Create the main order entry
    INSERT INTO public.orders (
        customer_id,
        vendor_id,
        item_description,
        payment_mode,
        total_cents,
        receiver_location,
        receiver_name,
        receiver_phone,
        sender_location,
        sender_name,
        sender_phone,
        order_type
    )
    VALUES (
        p_customer_id,
        p_vendor_id,
        v_product_name || ' (x' || p_purchase_quantity || ')',
        p_payment_mode,
        p_total_cents,
        p_receiver_location,
        p_receiver_name,
        p_receiver_phone,
        p_sender_location,
        p_sender_name,
        p_sender_phone,
        'marketplace'::public.order_type
    )
    RETURNING id INTO new_order_id;

    -- Insert into order_items
    INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit_price_cents
    )
    VALUES (
        new_order_id,
        p_product_id,
        p_purchase_quantity,
        v_unit_price_cents
    );

    -- Deduct stock
    UPDATE public.products
    SET stock = stock - p_purchase_quantity
    WHERE id = p_product_id;

    RETURN new_order_id;
END;
$$;

-- 15. Telemetry Events Table
-- For tracking shipment telemetry.
CREATE TABLE public.telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    speed_kph NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for telemetry_events
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telemetry events are viewable by assigned rider, customer, and admin." ON public.telemetry_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shipments WHERE shipments.id = shipment_id AND shipments.rider_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders JOIN public.shipments ON orders.id = shipments.order_id WHERE shipments.id = shipment_id AND orders.customer_id = auth.uid())
    OR current_user_is_admin()
);

-- 16. Shipments Table
-- For tracking shipment details.
CREATE TABLE public.shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    status public.shipment_status DEFAULT 'pending'::public.shipment_status NOT NULL,
    origin_lat NUMERIC NOT NULL,
    origin_lng NUMERIC NOT NULL,
    dest_lat NUMERIC NOT NULL,
    dest_lng NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipments are viewable by assigned rider, customer, and admin." ON public.shipments FOR SELECT USING (
    auth.uid() = rider_id
    OR EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
    OR current_user_is_admin()
);
CREATE POLICY "Riders can update their assigned shipments." ON public.shipments FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Admins can manage all shipments." ON public.shipments FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 17. OTP Codes Table
-- For one-time password verification.
CREATE TABLE public.otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for otp_codes
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OTP codes are only for the owner." ON public.otp_codes FOR ALL USING (FALSE); -- Should be managed by backend functions only

-- 18. Item Drops Table
-- This table is for item drop-off logistics.
CREATE TABLE public.item_drops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dropper_name TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_code TEXT NOT NULL,
    status public.drop_status DEFAULT 'registered'::public.drop_status NOT NULL,
    assigned_rider UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Set up RLS for item_drops
ALTER TABLE public.item_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Item drops are viewable by assigned rider and admin." ON public.item_drops FOR SELECT USING (
    auth.uid() = assigned_rider
    OR current_user_is_admin()
);
CREATE POLICY "Riders can update assigned item drops." ON public.item_drops FOR UPDATE USING (auth.uid() = assigned_rider);
CREATE POLICY "Admins can manage all item drops." ON public.item_drops FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- Initial Data (Optional)
-- INSERT INTO public.app_roles (role) VALUES ('customer'), ('vendor'), ('rider'), ('admin'), ('super_admin'), ('logistics_admin');
