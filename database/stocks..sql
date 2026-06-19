-- ============================================================================
-- EasyBlue Logistics :: Patch 004 (Transactional Inventory Decrements)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
  p_customer_id UUID,
  p_vendor_id UUID,
  p_product_type TEXT,
  p_purchase_quantity INTEGER,
  p_sender_name TEXT,
  p_sender_location TEXT,
  p_sender_phone TEXT,
  p_receiver_name TEXT,
  p_receiver_location TEXT,
  p_receiver_phone TEXT,
  p_payment_mode TEXT,
  p_total_cents INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_current_stock INTEGER;
  v_payment_enum payment_mode;
BEGIN
  -- 1) Acquire an explicit row-level lock on the vendor's stock row to prevent race conditions
  SELECT quantity INTO v_current_stock
  FROM public.vendor_stocks
  WHERE vendor_id = p_vendor_id AND product_type = p_product_type
  FOR UPDATE;

  -- 2) Check if stock record exists
  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Inventory Error: Product type % does not exist for this vendor.', p_product_type;
  END IF;

  -- 3) Enforce hard inventory ceilings
  IF v_current_stock < p_purchase_quantity THEN
    RAISE EXCEPTION 'Inventory Error: Insufficient stock. Requested %, but only % available.', 
      p_purchase_quantity, v_current_stock;
  END IF;

  -- 4) Safely cast payment mode text
  BEGIN
    v_payment_enum := p_payment_mode::payment_mode;
  EXCEPTION WHEN OTHERS THEN
    v_payment_enum := 'cash'::payment_mode;
  END;

  -- 5) Deduct stock quantity safely
  UPDATE public.vendor_stocks
  SET 
    quantity = quantity - p_purchase_quantity,
    updated_at = NOW()
  WHERE vendor_id = p_vendor_id AND product_type = p_product_type;

  -- 6) Write the real parent marketplace order
  INSERT INTO public.orders (
    id,
    customer_id,
    sender_name,
    sender_location,
    sender_phone,
    receiver_name,
    recipient_name,
    receiver_location,
    receiver_phone,
    payment_mode,
    payment_method,
    item_description,
    total_cents,
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
    p_receiver_name,
    p_receiver_location,
    p_receiver_phone,
    v_payment_enum,
    p_payment_mode,
    (p_purchase_quantity || 'x ' || p_product_type),
    p_total_cents,
    'pending'::shipment_status,
    1
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;