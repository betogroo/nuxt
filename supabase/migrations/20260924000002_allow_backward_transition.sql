-- Add is_return_requested to demands table
ALTER TABLE public.demands ADD COLUMN is_return_requested BOOLEAN DEFAULT FALSE;

-- Update the check_demand_status_transition function to allow backward transitions
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
        
        -- If moving backward, it can be any previous step.
        -- We allow new_idx < old_idx without restriction.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
