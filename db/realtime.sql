-- ============================================================================
-- EasyBlue Logistics :: Supabase Realtime Setup (SQL)
-- PostgreSQL / Supabase
-- ============================================================================
--
-- NOTE:
-- Supabase Realtime is typically enabled via the Supabase Dashboard UI.
-- However, this file provides the *table/replication* prerequisites and
-- some recommended identity settings so events are emitted reliably.
--
-- The exact "enable realtime" publication step is dashboard-dependent.
-- After running this SQL, go to: Supabase Dashboard -> Realtime -> enable
-- the listed tables.
--

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Recommended: Ensure replica identity so UPDATE/DELETE events include
--    enough row data. For our use-case (INSERT + UPDATE only) this is
--    mostly needed for future DELETE support.
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;
ALTER TABLE public.vendors REPLICA IDENTITY FULL;
ALTER TABLE public.vendor_stocks REPLICA IDENTITY FULL;
ALTER TABLE public.telemetry_events REPLICA IDENTITY FULL;

-- pending_signups is optional because your current schema.sql does NOT
-- define it. Create/adjust if/when you add it.
-- ALTER TABLE public.pending_signups REPLICA IDENTITY FULL;

COMMIT;