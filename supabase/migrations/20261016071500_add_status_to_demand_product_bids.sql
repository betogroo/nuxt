DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bid_status') THEN
    CREATE TYPE public.bid_status AS ENUM ('classified', 'disqualified');
  END IF;
END $$;

ALTER TABLE public.demand_product_bids
  ADD COLUMN IF NOT EXISTS status public.bid_status NOT NULL DEFAULT 'classified',
  ADD COLUMN IF NOT EXISTS disqualification_reason text NULL;
