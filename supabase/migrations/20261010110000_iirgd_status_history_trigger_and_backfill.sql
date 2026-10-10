-- 1. Backfill missing history for demands that do not have any entry in iirgd_demand_status_history
INSERT INTO public.iirgd_demand_status_history (demand_id, status, observation, created_at, created_by)
SELECT 
  d.id, 
  d.status, 
  d.observation, 
  d.created_at, 
  d.created_by
FROM public.iirgd_demands d
WHERE NOT EXISTS (
  SELECT 1 FROM public.iirgd_demand_status_history h WHERE h.demand_id = d.id
);

-- 2. Create trigger function to automatically record demand status history on insert or status update
CREATE OR REPLACE FUNCTION public.handle_iirgd_demand_status_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.iirgd_demand_status_history (
      demand_id,
      status,
      observation,
      created_at,
      created_by
    ) VALUES (
      NEW.id,
      NEW.status,
      NEW.observation,
      NEW.created_at,
      COALESCE(NEW.created_by, auth.uid())
    );
  ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.iirgd_demand_status_history (
      demand_id,
      status,
      observation,
      created_at,
      created_by
    ) VALUES (
      NEW.id,
      NEW.status,
      NEW.observation,
      now(),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to iirgd_demands
DROP TRIGGER IF EXISTS trigger_iirgd_demand_status_change ON public.iirgd_demands;
CREATE TRIGGER trigger_iirgd_demand_status_change
AFTER INSERT OR UPDATE OF status ON public.iirgd_demands
FOR EACH ROW
EXECUTE FUNCTION public.handle_iirgd_demand_status_change();

-- 4. Enable IIRGD roles to view profiles for history author display safely without recursion
CREATE OR REPLACE FUNCTION public.can_read_profile_for_history()
RETURNS boolean AS $$
BEGIN
  RETURN (
    public.is_admin()
    OR (public.get_my_current_role() = ANY (ARRAY['iirgd_user'::user_role, 'iirgd_manager'::user_role]))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "IIRGD roles can read profiles for history and demands" ON public.profiles;
CREATE POLICY "IIRGD roles can read profiles for history and demands"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.can_read_profile_for_history());
