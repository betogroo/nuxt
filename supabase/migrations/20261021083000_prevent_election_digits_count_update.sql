-- Function and trigger to prevent updating digits_count when active candidates exist
CREATE OR REPLACE FUNCTION public.check_election_digits_count_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.digits_count <> OLD.digits_count THEN
    IF EXISTS (
      SELECT 1 FROM public.candidates
      WHERE election_id = NEW.id
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Não é possível alterar a quantidade de dígitos de uma eleição que já possui candidatos cadastrados.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_election_digits_count_update ON public.elections;
CREATE TRIGGER trg_check_election_digits_count_update
  BEFORE UPDATE ON public.elections
  FOR EACH ROW
  EXECUTE FUNCTION public.check_election_digits_count_update();
