
-- 1. Add is_pending to measurement_units
ALTER TABLE public.measurement_units ADD COLUMN is_pending BOOLEAN NOT NULL DEFAULT false;

-- 2. Update RLS on measurement_units
DROP POLICY IF EXISTS "Everyone can read active units" ON public.measurement_units;
DROP POLICY IF EXISTS "Admin can full manage units" ON public.measurement_units;

-- Everyone can read all units (so they don't break in UI if pending)
CREATE POLICY "Everyone can read all units"
    ON public.measurement_units FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert units ONLY if is_pending = true and is_active = false
CREATE POLICY "Authenticated can suggest units"
    ON public.measurement_units FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (is_pending = true AND is_active = false));

-- Admin full manage
CREATE POLICY "Admin can full manage units"
    ON public.measurement_units FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 3. Update RLS on product_units
DROP POLICY IF EXISTS "Admin can manage product units" ON public.product_units;

-- Anyone can link a unit to a product
CREATE POLICY "Authenticated can link product units"
    ON public.product_units FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
