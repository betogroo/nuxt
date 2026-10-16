-- Fix validate_offer_opening_date: do NOT nullify offer_opening_date when dispute_date changes
CREATE OR REPLACE FUNCTION public.validate_offer_opening_date()
RETURNS TRIGGER AS $$
BEGIN
  -- We only validate if offer_opening_date is NOT NULL and
  -- (it is an INSERT, or offer_opening_date has changed, or dispute_date has changed)
  IF NEW.offer_opening_date IS NOT NULL AND 
     (TG_OP = 'INSERT' OR 
      NEW.offer_opening_date IS DISTINCT FROM OLD.offer_opening_date OR 
      NEW.dispute_date IS DISTINCT FROM OLD.dispute_date) THEN
     
     -- 1. Pelo menos 5 dias após hoje (considerando o fuso de São Paulo)
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 5 THEN
        RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 5 dias após hoje.';
     END IF;

     -- 2. Pelo menos 3 dias antes da data da disputa (se houver dispute_date)
     IF NEW.dispute_date IS NOT NULL THEN
       IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date > (NEW.dispute_date::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date - 3 THEN
          RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 3 dias antes da data da disputa.';
       END IF;
     END IF;

     -- 3. A hora de abertura deve estar entre 08:00 e 18:00
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::time < '08:00:00'::time OR 
        (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::time > '18:00:00'::time THEN
        RAISE EXCEPTION 'A hora de abertura das ofertas deve estar entre 08:00 e 18:00.';
     END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update check_demand_status_transition to enforce mandatory fields when advancing to 'dispute'
CREATE OR REPLACE FUNCTION public.check_demand_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    status_order text[] := ARRAY['planning', 'quotation', 'bidding_notice', 'dispute', 'homologation', 'completed'];
    old_idx int;
    new_idx int;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Allow cancelling from any status
        IF NEW.status = 'cancelled' THEN
            RETURN NEW;
        END IF;

        IF OLD.status = 'completed' THEN
            RAISE EXCEPTION 'A demanda concluída não pode mudar de status.';
        END IF;

        IF OLD.status = 'cancelled' THEN
            RAISE EXCEPTION 'A demanda cancelada não pode mudar de status.';
        END IF;

        old_idx := array_position(status_order, OLD.status::text);
        new_idx := array_position(status_order, NEW.status::text);

        -- If moving forward, it MUST be exactly one step
        IF new_idx > old_idx AND new_idx != old_idx + 1 THEN
            RAISE EXCEPTION 'A demanda só pode avançar uma etapa por vez.';
        END IF;

        -- If advancing to 'dispute', require all 4 mandatory fields
        IF NEW.status = 'dispute' AND new_idx > old_idx THEN
            IF NEW.bidding_notice_number IS NULL OR trim(NEW.bidding_notice_number) = '' THEN
                RAISE EXCEPTION 'O número do aviso de contratação é obrigatório para avançar para a disputa.';
            END IF;
            IF NEW.dispute_number IS NULL OR trim(NEW.dispute_number) = '' THEN
                RAISE EXCEPTION 'O número da disputa é obrigatório para avançar para a disputa.';
            END IF;
            IF NEW.dispute_date IS NULL THEN
                RAISE EXCEPTION 'A data da disputa é obrigatória para avançar para a disputa.';
            END IF;
            IF NEW.offer_opening_date IS NULL THEN
                RAISE EXCEPTION 'A data e hora de abertura de ofertas são obrigatórias para avançar para a disputa.';
            END IF;
        END IF;
        
        -- If moving backward, it can be any previous step.
        -- We allow new_idx < old_idx without restriction.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
