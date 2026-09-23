-- 1. Add 'quotation' to demand_status ENUM
ALTER TYPE public.demand_status ADD VALUE 'quotation' AFTER 'planning';

-- 2. Add reference_price to demand_products
ALTER TABLE public.demand_products ADD COLUMN reference_price NUMERIC(15, 4);

-- 3. Update the check_demand_status_transition function to include 'quotation'
CREATE OR REPLACE FUNCTION public.check_demand_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Allow cancelling from any status
        IF NEW.status = 'cancelled' THEN
            RETURN NEW;
        END IF;

        IF OLD.status = 'planning' AND NEW.status != 'quotation' THEN
            RAISE EXCEPTION 'A demanda em planejamento só pode avançar para cotação ou ser cancelada.';
        END IF;

        IF OLD.status = 'quotation' AND NEW.status != 'bidding_notice' THEN
            RAISE EXCEPTION 'A demanda em cotação só pode avançar para o aviso de contratação ou ser cancelada.';
        END IF;

        IF OLD.status = 'bidding_notice' AND NEW.status != 'dispute' THEN
            RAISE EXCEPTION 'A demanda em aviso só pode avançar para disputa ou ser cancelada.';
        END IF;

        IF OLD.status = 'dispute' AND NEW.status != 'homologation' THEN
            RAISE EXCEPTION 'A demanda em disputa só pode avançar para homologação ou ser cancelada.';
        END IF;

        IF OLD.status = 'homologation' AND NEW.status != 'completed' THEN
            RAISE EXCEPTION 'A demanda em homologação só pode avançar para concluída ou ser cancelada.';
        END IF;

        IF OLD.status = 'completed' THEN
            RAISE EXCEPTION 'A demanda concluída não pode mudar de status.';
        END IF;

        IF OLD.status = 'cancelled' THEN
            RAISE EXCEPTION 'A demanda cancelada não pode mudar de status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
