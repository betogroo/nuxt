-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage demand_responsibles" ON public.demand_responsibles;
DROP POLICY IF EXISTS "Demand creator can manage responsibles" ON public.demand_responsibles;

-- Recreate with explicit WITH CHECK
CREATE POLICY "Admins can manage demand_responsibles" ON public.demand_responsibles 
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Demand creator can manage responsibles" ON public.demand_responsibles 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id = auth.uid())
);