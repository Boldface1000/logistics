
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_events;

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read telemetry"
ON public.telemetry_events FOR SELECT TO authenticated
USING(public.is_admin());
