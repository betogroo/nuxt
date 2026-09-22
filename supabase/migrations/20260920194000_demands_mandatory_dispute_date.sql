-- Make dispute_date mandatory
-- If there are existing rows with NULL, we set them to current_date just to satisfy the constraint
UPDATE public.demands SET dispute_date = CURRENT_DATE WHERE dispute_date IS NULL;
ALTER TABLE public.demands ALTER COLUMN dispute_date SET NOT NULL;

-- Update the validation function to also clear offer_opening_date if dispute_date changes
CREATE OR REPLACE FUNCTION public.validate_offer_opening_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If dispute_date changes during an update, force offer_opening_date to NULL
  IF TG_OP = 'UPDATE' AND NEW.dispute_date IS DISTINCT FROM OLD.dispute_date THEN
    NEW.offer_opening_date = NULL;
  END IF;

  -- We only validate if the column is NOT NULL and (it is an INSERT or the value has changed)
  IF NEW.offer_opening_date IS NOT NULL AND 
     (TG_OP = 'INSERT' OR NEW.offer_opening_date IS DISTINCT FROM OLD.offer_opening_date) THEN
     
     -- 1. Pelo menos 5 dias depois de hoje (considering local date of insertion)
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 5 THEN
        RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 5 dias após hoje.';
     END IF;

     -- 2. Pelo menos 3 dias antes da data da disputa
     -- Since dispute_date is now NOT NULL, we don't need to check IF NEW.dispute_date IS NOT NULL
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date > (NEW.dispute_date::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date - 3 THEN
        RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 3 dias antes da data da disputa.';
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
