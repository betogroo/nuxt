-- Migration: Intervalo de lances sem valor padrão e obrigatório para avançar ao Aviso de Contratação
-- 1. Remove os valores padrão (3% / percentual) das colunas de intervalo de lances
ALTER TABLE public.demand_products ALTER COLUMN bid_interval DROP DEFAULT;
ALTER TABLE public.demand_products ALTER COLUMN bid_interval_type DROP DEFAULT;

-- 2. Limpa o intervalo padrão (3% / percentual) dos itens de demandas ainda não avançadas
--    (planejamento / cotação), forçando a conferência e o preenchimento consciente.
UPDATE public.demand_products dp
SET bid_interval = NULL,
    bid_interval_type = NULL
FROM public.demands d
WHERE d.id = dp.demand_id
  AND d.status IN ('planning', 'quotation')
  AND dp.bid_interval = 3
  AND dp.bid_interval_type = 'percentage';

-- 3. Trava no trigger de transição de status: ao passar da fase de cotação (ou anterior)
--    para o Aviso de Contratação (ou posterior), todos os itens precisam ter o intervalo definido.
--    A regra vale inclusive para demandas históricas / legadas.
CREATE OR REPLACE FUNCTION public.check_demand_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    status_order text[] := ARRAY['planning', 'quotation', 'bidding_notice', 'dispute', 'homologation', 'completed'];
    old_idx int;
    new_idx int;
    v_is_historical boolean;
    v_pending_items int;
BEGIN
    v_is_historical := COALESCE(NEW.is_historical, false);

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Allow cancelling from any status
        IF NEW.status = 'cancelled' THEN
            RETURN NEW;
        END IF;

        IF OLD.status = 'completed' AND NOT v_is_historical THEN
            RAISE EXCEPTION 'A demanda concluída não pode mudar de status.';
        END IF;

        IF OLD.status = 'cancelled' THEN
            RAISE EXCEPTION 'A demanda cancelada não pode mudar de status.';
        END IF;

        old_idx := array_position(status_order, OLD.status::text);
        new_idx := array_position(status_order, NEW.status::text);

        -- Intervalo de lances obrigatório ao passar para o Aviso de Contratação (inclusive demandas históricas)
        IF old_idx IS NOT NULL AND new_idx IS NOT NULL AND old_idx < 3 AND new_idx >= 3 THEN
            SELECT COUNT(*) INTO v_pending_items
            FROM public.demand_products
            WHERE demand_id = NEW.id
              AND (bid_interval IS NULL OR bid_interval <= 0 OR bid_interval_type IS NULL);

            IF v_pending_items > 0 THEN
                RAISE EXCEPTION 'Informe o tipo e o valor do intervalo de lances de todos os produtos antes de avançar para o Aviso de Contratação. Itens pendentes: %.', v_pending_items;
            END IF;
        END IF;

        -- For historical demands, bypass linear step progression
        IF v_is_historical THEN
            RETURN NEW;
        END IF;

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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
