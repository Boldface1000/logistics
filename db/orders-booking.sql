-- ============================================================================
-- EasyBlue Logistics :: Patch 002 (Database-Backed Order Persistence RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_db_order(
  p_customer_id UUID,
  p_sender_name TEXT,
  p_sender_location TEXT,
  p_sender_phone TEXT,
  p_receiver_name TEXT,
  p_receiver_location TEXT,
  p_receiver_phone TEXT,
  p_payment_mode TEXT,
  p_item_description TEXT,
  p_total_cents INTEGER DEFAULT 0,
  p_park_name TEXT DEFAULT NULL,
  p_contact_number TEXT DEFAULT NULL,
  p_driver_or_storekeeper_number TEXT DEFAULT NULL,
  p_content_of_item TEXT DEFAULT NULL,
  p_amount_to_be_paid TEXT DEFAULT NULL,
  p_drop_off_point TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_payment_enum payment_mode;
BEGIN
  -- 1) Safely cast incoming text to payment_mode enum type
  BEGIN
    v_payment_enum := p_payment_mode::payment_mode;
  EXCEPTION WHEN OTHERS THEN
    v_payment_enum := 'cash'::payment_mode; -- fallback safe default
  END;

  -- 2) Insert directly into the real public.orders table
  INSERT INTO public.orders (
    id,
    customer_id,
    sender_name,
    sender_location,
    sender_phone,
    receiver_name,
    recipient_name, -- Populate our new compatibility alias column
    receiver_location,
    receiver_phone,
    payment_mode,
    payment_method, -- Populate our new compatibility alias column
    item_description,
    total_cents,
    park_name,
    contact_number,
    driver_or_storekeeper_number,
    content_of_item,
    amount_to_be_paid,
    drop_off_point,
    status,
    status_version
  )
  VALUES (
    gen_random_uuid(),
    p_customer_id,
    p_sender_name,
    p_sender_location,
    p_sender_phone,
    p_receiver_name,
    p_receiver_name, -- alias compatibility mapping
    p_receiver_location,
    p_receiver_phone,
    v_payment_enum,
    p_payment_mode,  -- alias compatibility mapping
    p_item_description,
    p_total_cents,
    p_park_name,
    p_contact_number,
    p_driver_or_storekeeper_number,
    p_content_of_item,
    p_amount_to_be_paid,
    p_drop_off_point,
    'pending'::shipment_status,
    1
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;