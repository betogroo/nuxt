-- Migration: 20261120130000_fix_school_incidents_rls_and_created_by.sql
-- Description: Fix RLS policies and created_by default/trigger for school_incidents table.

-- 1. Ensure DEFAULT auth.uid() and trigger on school_incidents.created_by
ALTER TABLE public.school_incidents
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP TRIGGER IF EXISTS set_created_by_school_incidents ON public.school_incidents;
CREATE TRIGGER set_created_by_school_incidents
  BEFORE INSERT ON public.school_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();

-- 2. Helper functions with SECURITY DEFINER to evaluate school roles safely without RLS recursion
CREATE OR REPLACE FUNCTION public.can_manage_school_incidents()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.get_my_current_role() = 'school-manager'::user_role;
$$;

CREATE OR REPLACE FUNCTION public.can_create_school_incidents()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.get_my_current_role() IN ('school-manager'::user_role, 'school-user'::user_role);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_school_incidents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_school_incidents() TO authenticated;

-- 3. Update school_incidents RLS policies
DROP POLICY IF EXISTS "school_incidents_insert_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_insert_policy"
ON public.school_incidents
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_create_school_incidents()
  AND (
    COALESCE(created_by, auth.uid()) = auth.uid()
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "school_incidents_select_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_select_policy"
ON public.school_incidents
FOR SELECT
TO authenticated
USING (
  public.can_manage_school_incidents()
  OR (
    created_by = auth.uid()
    AND public.can_create_school_incidents()
  )
);

DROP POLICY IF EXISTS "school_incidents_update_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_update_policy"
ON public.school_incidents
FOR UPDATE
TO authenticated
USING (
  public.can_manage_school_incidents()
  OR (
    created_by = auth.uid()
    AND public.can_create_school_incidents()
  )
);

DROP POLICY IF EXISTS "school_incidents_delete_policy" ON public.school_incidents;
CREATE POLICY "school_incidents_delete_policy"
ON public.school_incidents
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- 4. Update school_incident_participants RLS policies
DROP POLICY IF EXISTS "school_incident_participants_insert_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_insert_policy"
ON public.school_incident_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
    AND (
      si.created_by = auth.uid()
      OR public.can_manage_school_incidents()
    )
  )
);

DROP POLICY IF EXISTS "school_incident_participants_select_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_select_policy"
ON public.school_incident_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
    AND (
      si.created_by = auth.uid()
      OR public.can_manage_school_incidents()
    )
  )
);

DROP POLICY IF EXISTS "school_incident_participants_update_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_update_policy"
ON public.school_incident_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
    AND (
      si.created_by = auth.uid()
      OR public.can_manage_school_incidents()
    )
  )
);

DROP POLICY IF EXISTS "school_incident_participants_delete_policy" ON public.school_incident_participants;
CREATE POLICY "school_incident_participants_delete_policy"
ON public.school_incident_participants
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.school_incidents si
    WHERE si.id = school_incident_participants.incident_id
    AND (
      si.created_by = auth.uid()
      OR public.can_manage_school_incidents()
    )
  )
);

-- 5. Allow school roles to view profile details of incident authors safely
DROP POLICY IF EXISTS "School roles can read profiles for incidents" ON public.profiles;
CREATE POLICY "School roles can read profiles for incidents"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.get_my_current_role() IN ('school-manager'::user_role, 'school-user'::user_role)
  );

NOTIFY pgrst, 'reload schema';
