-- 1. Alterar dispute_date para nao obrigatorio
ALTER TABLE public.demands ALTER COLUMN dispute_date DROP NOT NULL;

-- 2. Atualizar trigger validate_offer_opening_date
CREATE OR REPLACE FUNCTION public.validate_offer_opening_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Se dispute_date for alterado e ficar diferente, anular offer_opening_date
  IF TG_OP = 'UPDATE' AND NEW.dispute_date IS DISTINCT FROM OLD.dispute_date THEN
    NEW.offer_opening_date = NULL;
  END IF;

  IF NEW.offer_opening_date IS NOT NULL AND 
     (TG_OP = 'INSERT' OR NEW.offer_opening_date IS DISTINCT FROM OLD.offer_opening_date) THEN
     
     -- 5 dias de antecedencia
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 5 THEN
        RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 5 dias após hoje.';
     END IF;

     -- 3 dias de antecedencia da disputa, SOMENTE SE dispute_date existe
     IF NEW.dispute_date IS NOT NULL THEN
       IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::date > (NEW.dispute_date::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date - 3 THEN
          RAISE EXCEPTION 'A data de abertura das ofertas deve ser pelo menos 3 dias antes da data da disputa.';
       END IF;
     END IF;

     -- Hora limite
     IF (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::time < '08:00:00'::time OR 
        (NEW.offer_opening_date AT TIME ZONE 'America/Sao_Paulo')::time > '18:00:00'::time THEN
        RAISE EXCEPTION 'A hora de abertura das ofertas deve estar entre 08:00 e 18:00.';
     END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar Enum e coluna Status
CREATE TYPE demand_status AS ENUM ('planning', 'bidding_notice', 'dispute', 'homologation', 'completed', 'cancelled');
ALTER TABLE public.demands ADD COLUMN status demand_status NOT NULL DEFAULT 'planning';

-- 4. Adicionar campos extras
ALTER TABLE public.demands ADD COLUMN bidding_notice_number text;
ALTER TABLE public.demands ADD COLUMN dispute_number text;
ALTER TABLE public.demands ADD COLUMN contract_number text;

-- 5. Trigger para progresso linear de status
CREATE OR REPLACE FUNCTION public.check_demand_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  old_idx int;
  new_idx int;
  status_array demand_status[] := ARRAY['planning', 'bidding_notice', 'dispute', 'homologation', 'completed']::demand_status[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelled' THEN
      RETURN NEW; -- Sempre pode cancelar
    END IF;

    old_idx := array_position(status_array, OLD.status);
    new_idx := array_position(status_array, NEW.status);

    -- Permite apenas avancar 1 passo, ou voltar para passos anteriores
    IF new_idx > old_idx + 1 THEN
      RAISE EXCEPTION 'Não é permitido pular etapas no fluxo de status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_demand_status_transition
  BEFORE UPDATE ON public.demands
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_demand_status_transition();

-- 6. Tabela demand_responsibles
CREATE TABLE public.demand_responsibles (
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (demand_id, user_id)
);

ALTER TABLE public.demand_responsibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demand_responsibles" ON public.demand_responsibles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage demand_responsibles" ON public.demand_responsibles FOR ALL USING (public.is_admin());
CREATE POLICY "Demand creator can manage responsibles" ON public.demand_responsibles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.user_id = auth.uid())
);

-- 7. Trigger para inserir criador nos responsáveis
CREATE OR REPLACE FUNCTION public.add_demand_creator_as_responsible()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.demand_responsibles (demand_id, user_id) VALUES (NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_demand_creator_responsible
  AFTER INSERT ON public.demands
  FOR EACH ROW
  EXECUTE PROCEDURE public.add_demand_creator_as_responsible();

-- Para as demandas antigas (se houver), popular os responsáveis
INSERT INTO public.demand_responsibles (demand_id, user_id)
SELECT id, user_id FROM public.demands ON CONFLICT DO NOTHING;

