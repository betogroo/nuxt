-- Migration: Allow user-election role to insert and update elections as well
DROP POLICY IF EXISTS "Allow election managers and admins to insert elections" ON public.elections;
CREATE POLICY "Allow election authorized roles to insert elections"
  ON public.elections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election managers and admins to update elections" ON public.elections;
CREATE POLICY "Allow election authorized roles to update elections"
  ON public.elections FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );
