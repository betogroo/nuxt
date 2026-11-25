-- Migration: 20261125110000_prevent_updating_iirgd_demands_with_older_unconcluded.sql
-- Description: Prevent updating status of newer IIRGD demands until older demands for the same citizen are concluded.

CREATE OR REPLACE FUNCTION public.check_iirgd_demand_older_demands_concluded()
RETURNS trigger AS $$
DECLARE
  older_count integer;
BEGIN
  -- Bypass during restore or replica operations if configured
  IF current_setting('app.restoring_backup', true) = 'true' 
     OR current_setting('session_replication_role', true) = 'replica' THEN
    RETURN NEW;
  END IF;

  -- Only validate if status is actually changing
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT count(*) INTO older_count
    FROM public.iirgd_demands
    WHERE citizen_id = NEW.citizen_id
      AND id <> NEW.id
      AND created_at < NEW.created_at
      AND status NOT IN ('issued', 'protocol_cancelled', 'confrontation_failed', 'unknown_error');

    IF older_count > 0 THEN
      RAISE EXCEPTION 'Não é possível alterar o status desta demanda pois o cidadão possui uma solicitação anterior ainda não concluída.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to iirgd_demands
DROP TRIGGER IF EXISTS trigger_check_iirgd_demand_older_demands_concluded ON public.iirgd_demands;
CREATE TRIGGER trigger_check_iirgd_demand_older_demands_concluded
BEFORE UPDATE OF status ON public.iirgd_demands
FOR EACH ROW
EXECUTE FUNCTION public.check_iirgd_demand_older_demands_concluded();
