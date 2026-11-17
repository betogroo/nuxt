-- Migration: 20261117180000_allow_responsibles_update_demands.sql
-- Description:
-- 1. Create helper function public.is_demand_responsible(p_demand_id uuid) to check if the current authenticated user is listed in public.demand_responsibles.
-- 2. Add RLS policy on public.demands allowing demand responsibles to update the demand.
-- 3. Add RLS policy on public.demand_responsibles allowing demand responsibles to add new responsibles to the demand.

CREATE OR REPLACE FUNCTION public.is_demand_responsible(p_demand_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.demand_responsibles dr
    WHERE dr.demand_id = p_demand_id
      AND dr.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_demand_responsible(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Responsibles can update demands" ON public.demands;
CREATE POLICY "Responsibles can update demands"
  ON public.demands
  FOR UPDATE
  TO authenticated
  USING (public.is_demand_responsible(id))
  WITH CHECK (public.is_demand_responsible(id));

DROP POLICY IF EXISTS "Demand responsibles can add responsibles" ON public.demand_responsibles;
CREATE POLICY "Demand responsibles can add responsibles"
  ON public.demand_responsibles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_demand_responsible(demand_id));
