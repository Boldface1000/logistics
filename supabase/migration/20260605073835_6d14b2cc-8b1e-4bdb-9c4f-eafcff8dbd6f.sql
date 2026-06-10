
-- Helper: storage.objects path convention is "<user_id>/<filename>"
-- so the first folder segment of `name` is the owner's user id.

-- avatars
CREATE POLICY "avatars self read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars self write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars self update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars self delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- payment-proofs
CREATE POLICY "proofs self write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proofs self read"  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proofs admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'super_admin'));

-- nin-photos
CREATE POLICY "nin self write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "nin self read"  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'nin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "nin admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'nin-photos'
         AND public.current_user_has_any_role(ARRAY['super_admin','logistics_admin']::public.app_role[]));

-- receipts (server uploads via service_role; users get signed URLs from server fn)
CREATE POLICY "receipts admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts'
         AND public.current_user_has_any_role(ARRAY['super_admin','logistics_admin']::public.app_role[]));
