-- ============================================================================
-- EasyBlue Logistics :: Patch 003 (State Machine & Concurrency Enforcement)
-- ============================================================================

BEGIN;

-- Create an explicit verification function for order updates
CREATE OR REPLACE FUNCTION public.enforce_order_state_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- If the status isn't changing, bypass the checks but increment the concurrency version tracker
  IF OLD.status = NEW.status THEN
    NEW.status_version := OLD.status_version + 1;
    RETURN NEW;
  END IF;

  -- State machine routing validation rules
  IF OLD.status = 'pending'::shipment_status AND NEW.status NOT IN ('assigned'::shipment_status, 'cancelled'::shipment_status) THEN
    RAISE EXCEPTION 'Invalid transition: Pending orders can only move to Assigned or Cancelled.';
  
  ELSIF OLD.status = 'assigned'::shipment_status AND NEW.status NOT IN ('accepted'::shipment_status, 'declined'::shipment_status, 'cancelled'::shipment_status) THEN
    RAISE EXCEPTION 'Invalid transition: Assigned orders must be Accepted, Declined, or Cancelled.';
  
  ELSIF OLD.status = 'accepted'::shipment_status AND NEW.status NOT IN ('in_transit'::shipment_status, 'cancelled'::shipment_status) THEN
    RAISE EXCEPTION 'Invalid transition: Accepted orders must move to In Transit or Cancelled.';
  
  ELSIF OLD.status = 'in_transit'::shipment_status AND NEW.status NOT IN ('out_for_delivery'::shipment_status, 'cancelled'::shipment_status) THEN
    RAISE EXCEPTION 'Invalid transition: In Transit orders must move to Out For Delivery or Cancelled.';
  
  ELSIF OLD.status = 'out_for_delivery'::shipment_status AND NEW.status NOT IN ('delivered'::shipment_status, 'cancelled'::shipment_status) THEN
    RAISE EXCEPTION 'Invalid transition: Out for Delivery orders must move to Delivered or Cancelled.';

  ELSIF OLD.status IN ('delivered'::shipment_status, 'cancelled'::shipment_status) THEN
    RAISE EXCEPTION 'Terminal State Violation: Completed or Cancelled orders cannot be updated.';
  END IF;

  -- Enforce optimistic locking version tracking to block stale frontend race conditions
  NEW.status_version := OLD.status_version + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind validation trigger safely to your existing orders infrastructure
DROP TRIGGER IF EXISTS trg_enforce_order_state ON public.orders;
CREATE TRIGGER trg_enforce_order_state
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_state_transitions();

COMMIT;