-- Drop old policies for iirgd_demands
DROP POLICY IF EXISTS "Admin and IIRGD full access on iirgd_demands" ON public.iirgd_demands;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.iirgd_demands;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.iirgd_demands;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.iirgd_demands;

-- Recreate policies for iirgd_demands
CREATE POLICY "Admin and IIRGD full access on iirgd_demands"
  ON public.iirgd_demands
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'iirgd_user', 'iirgd_manager')
  );

-- Drop old policies for iirgd_citizens
DROP POLICY IF EXISTS "iirgd_citizens_read_policy" ON public.iirgd_citizens;
DROP POLICY IF EXISTS "iirgd_citizens_insert_policy" ON public.iirgd_citizens;
DROP POLICY IF EXISTS "iirgd_citizens_update_policy" ON public.iirgd_citizens;

-- Recreate policies for iirgd_citizens
CREATE POLICY "iirgd_citizens_read_policy" ON public.iirgd_citizens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'iirgd_user', 'iirgd_manager'))
  );

CREATE POLICY "iirgd_citizens_insert_policy" ON public.iirgd_citizens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'iirgd_user', 'iirgd_manager'))
  );

CREATE POLICY "iirgd_citizens_update_policy" ON public.iirgd_citizens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'iirgd_user', 'iirgd_manager'))
  );
