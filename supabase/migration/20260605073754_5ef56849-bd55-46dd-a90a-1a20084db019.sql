
DO $$ BEGIN
  CREATE TYPE public.proof_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.bank_transfer_proofs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency        TEXT NOT NULL DEFAULT 'NGN',
  bank_name       TEXT,
  sender_name     TEXT,
  reference_text  TEXT,                   -- transfer narration/ref the customer typed
  proof_path      TEXT NOT NULL,          -- Storage path under 'payment-proofs' bucket
  status          public.proof_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bank_transfer_proofs TO authenticated;
GRANT ALL ON public.bank_transfer_proofs TO service_role;
ALTER TABLE public.bank_transfer_proofs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_btp_order ON public.bank_transfer_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_btp_status ON public.bank_transfer_proofs(status);
CREATE TRIGGER trg_btp_updated_at BEFORE UPDATE ON public.bank_transfer_proofs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "btp customer insert" ON public.bank_transfer_proofs FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY "btp customer read"  ON public.bank_transfer_proofs FOR SELECT TO authenticated
  USING (customer_id = auth.uid());
CREATE POLICY "btp rider read"     ON public.bank_transfer_proofs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.riders r ON r.id = o.assigned_rider_id
    WHERE o.id = order_id AND r.user_id = auth.uid()
  ));
CREATE POLICY "btp admin manage"   ON public.bank_transfer_proofs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- When a super admin approves a proof, mark the related order as paid.
CREATE OR REPLACE FUNCTION public.apply_approved_transfer_to_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_approved_transfer_to_order() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_btp_approval ON public.bank_transfer_proofs;
CREATE TRIGGER trg_btp_approval
  AFTER UPDATE ON public.bank_transfer_proofs
  FOR EACH ROW EXECUTE FUNCTION public.apply_approved_transfer_to_order();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_transfer_proofs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
