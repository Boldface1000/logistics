-- Support chat between customers/vendors and admins
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_is_admin BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_conv ON public.support_messages(conversation_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

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
      (sender_is_admin = false AND conversation_user_id = auth.uid())
      OR (sender_is_admin = true AND current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role]))
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

-- Soft-delete column for admin user management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

-- Admin disable policy
CREATE POLICY "profile admin update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role]))
  WITH CHECK (current_user_has_any_role(ARRAY['super_admin'::app_role, 'logistics_admin'::app_role]));