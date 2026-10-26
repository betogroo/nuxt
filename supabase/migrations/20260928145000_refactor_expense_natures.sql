-- 1. Ensure expense_nature "33903000" exists
INSERT INTO public.expense_natures (id, name, is_active, is_pending) 
VALUES ('33903000', 'MATERIAL DE CONSUMO - OUTROS', true, false)
ON CONFLICT (id) DO UPDATE SET is_active = true, is_pending = false;

-- 2. Update existing products to point to '33903000' if they don't have an expense_nature_id
UPDATE public.products 
SET expense_nature_id = '33903000' 
WHERE expense_nature_id IS NULL;

-- 3. Make expense_nature_id NOT NULL in products
ALTER TABLE public.products ALTER COLUMN expense_nature_id SET NOT NULL;

-- 4. Update the snapshot trigger in demand_products
DROP TRIGGER IF EXISTS tr_populate_demand_product_snapshots ON public.demand_products;
DROP FUNCTION IF EXISTS populate_demand_product_snapshots();

ALTER TABLE public.demand_products
  DROP COLUMN IF EXISTS category_name_snapshot,
  ADD COLUMN IF NOT EXISTS expense_nature_name_snapshot VARCHAR(255);

CREATE OR REPLACE FUNCTION populate_demand_product_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  -- Snapshot product name
  SELECT name INTO NEW.product_name_snapshot 
  FROM products 
  WHERE id = NEW.product_id;
  
  -- Snapshot unit name
  SELECT name INTO NEW.unit_name_snapshot 
  FROM measurement_units 
  WHERE id = NEW.unit_id;
  
  -- Snapshot expense nature name
  SELECT en.name INTO NEW.expense_nature_name_snapshot 
  FROM products p 
  JOIN expense_natures en ON p.expense_nature_id = en.id 
  WHERE p.id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_populate_demand_product_snapshots
BEFORE INSERT OR UPDATE OF product_id, unit_id ON demand_products
FOR EACH ROW
EXECUTE FUNCTION populate_demand_product_snapshots();

-- Refire the trigger to backfill
UPDATE public.demand_products
SET id = id;

-- 5. Drop categories from products
ALTER TABLE public.products DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.products DROP COLUMN IF EXISTS suggested_category;

-- 6. Drop the categories table
DROP TABLE IF EXISTS public.product_categories CASCADE;
