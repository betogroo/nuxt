CREATE TABLE public.demand_product_bids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_product_id uuid NOT NULL REFERENCES public.demand_products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  amount numeric(15,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) DEFAULT auth.uid(),
  CONSTRAINT unique_demand_product_supplier UNIQUE (demand_product_id, supplier_id)
);

ALTER TABLE public.demand_product_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bids"
  ON public.demand_product_bids
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bids"
  ON public.demand_product_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bids"
  ON public.demand_product_bids
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bids"
  ON public.demand_product_bids
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_product_bids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_product_bids TO service_role;
