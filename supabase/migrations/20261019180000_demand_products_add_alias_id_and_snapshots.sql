-- Migration: 20261019180000_demand_products_add_alias_id_and_snapshots.sql
-- Description: Add alias_id, alias_name_snapshot, and alias_code_snapshot to demand_products

ALTER TABLE public.demand_products
  ADD COLUMN IF NOT EXISTS alias_id UUID REFERENCES public.measurement_unit_aliases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alias_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alias_code_snapshot INTEGER;

CREATE INDEX IF NOT EXISTS idx_demand_products_alias_id ON public.demand_products(alias_id);

CREATE OR REPLACE FUNCTION populate_demand_product_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  -- Snapshot product name
  SELECT name INTO NEW.product_name_snapshot 
  FROM public.products 
  WHERE id = NEW.product_id;
  
  -- Snapshot unit name
  SELECT name INTO NEW.unit_name_snapshot 
  FROM public.measurement_units 
  WHERE id = NEW.unit_id;
  
  -- Snapshot expense nature name
  SELECT en.name INTO NEW.expense_nature_name_snapshot 
  FROM public.products p 
  JOIN public.expense_natures en ON p.expense_nature_id = en.id 
  WHERE p.id = NEW.product_id;
  
  -- Snapshot alias name and code
  IF NEW.alias_id IS NOT NULL THEN
    SELECT name, code INTO NEW.alias_name_snapshot, NEW.alias_code_snapshot
    FROM public.measurement_unit_aliases
    WHERE id = NEW.alias_id;
  ELSE
    NEW.alias_name_snapshot := NULL;
    NEW.alias_code_snapshot := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_populate_demand_product_snapshots ON public.demand_products;

CREATE TRIGGER tr_populate_demand_product_snapshots
BEFORE INSERT OR UPDATE OF product_id, unit_id, alias_id ON public.demand_products
FOR EACH ROW
EXECUTE FUNCTION populate_demand_product_snapshots();
