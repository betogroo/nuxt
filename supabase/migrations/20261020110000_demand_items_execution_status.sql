-- Create enum for demand item execution lifecycle status
DO $$ BEGIN
  CREATE TYPE demand_item_execution_status AS ENUM (
    'homologated',
    'commitment_sent',
    'commitment_confirmed',
    'shipped',
    'delivered',
    'received',
    'completed',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add execution status columns to demand_products
ALTER TABLE public.demand_products
  ADD COLUMN IF NOT EXISTS execution_status demand_item_execution_status DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS execution_error_details text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS execution_status_updated_at timestamptz DEFAULT NULL;

-- Create table to track history of item execution statuses
CREATE TABLE IF NOT EXISTS public.demand_item_status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_product_id uuid NOT NULL REFERENCES public.demand_products(id) ON DELETE CASCADE,
  status demand_item_execution_status NOT NULL,
  observation text,
  error_details text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demand_products_execution_status ON public.demand_products(execution_status);
CREATE INDEX IF NOT EXISTS idx_demand_item_status_history_item_id ON public.demand_item_status_history(demand_product_id);

-- Enable Row Level Security
ALTER TABLE public.demand_item_status_history ENABLE ROW LEVEL SECURITY;

-- Policies for demand_item_status_history
DROP POLICY IF EXISTS "Allow authenticated read demand_item_status_history" ON public.demand_item_status_history;
CREATE POLICY "Allow authenticated read demand_item_status_history"
  ON public.demand_item_status_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert demand_item_status_history" ON public.demand_item_status_history;
CREATE POLICY "Allow authenticated insert demand_item_status_history"
  ON public.demand_item_status_history FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update demand_item_status_history" ON public.demand_item_status_history;
CREATE POLICY "Allow authenticated update demand_item_status_history"
  ON public.demand_item_status_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Grant privileges
GRANT ALL ON TABLE public.demand_item_status_history TO authenticated, service_role;
GRANT ALL ON TABLE public.demand_item_status_history TO anon;
