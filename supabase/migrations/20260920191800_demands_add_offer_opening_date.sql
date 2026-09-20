-- Add column
ALTER TABLE public.demands
ADD COLUMN offer_opening_date timestamptz NULL;

-- Create validation function
CREATE OR REPLACE FUNCTION public.validate_offer_opening_date()
RETURNS TRIGGER AS $$
BEGIN
  -- We only validate if the column is NOT NULL and (it is an INSERT or the value has changed)
  IF NEW.offer_opening_date IS NOT NULL AND 
     (TG_OP = 'INSERT' OR NEW.offer_opening_date IS DISTINCT FROM OLD.offer_opening_date) THEN
     
     -- 1. Pelo menos 5 dias depois de hoje (considering local date of insertion)
     -- Let's assume current date based on America/Sao_Paulo
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 5 THEN
        RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 5 dias após hoje.';
     END IF;

     -- 2. Pelo menos 3 dias antes da data da disputa (se existir)
     IF NEW.dispute_date IS NOT NULL THEN
        IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date > (NEW.dispute_date::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date - 3 THEN
           RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 3 dias antes da data da disputa.';
        END IF;
     END IF;

     -- 3. A hora deve estar entre 08:00 e 18:00
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::time < '08:00:00'::time OR 
        (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::time > '18:00:00'::time THEN
        RAISE EXCEPTION 'A hora de abertura das ofertas deve estar entre 08:00 e 18:00.';
     END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_validate_offer_opening_date ON public.demands;

CREATE TRIGGER trg_validate_offer_opening_date
BEFORE INSERT OR UPDATE ON public.demands
FOR EACH ROW
EXECUTE FUNCTION public.validate_offer_opening_date();
