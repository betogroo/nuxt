-- Add snapshot columns to demand_products
ALTER TABLE demand_products
ADD COLUMN product_name_snapshot VARCHAR(255),
ADD COLUMN unit_name_snapshot VARCHAR(255),
ADD COLUMN category_name_snapshot VARCHAR(255);

-- Create a function to populate snapshots
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
  
  -- Snapshot category name
  SELECT pc.name INTO NEW.category_name_snapshot 
  FROM products p 
  JOIN product_categories pc ON p.category_id = pc.id 
  WHERE p.id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER tr_populate_demand_product_snapshots
BEFORE INSERT OR UPDATE OF product_id, unit_id ON demand_products
FOR EACH ROW
EXECUTE FUNCTION populate_demand_product_snapshots();

-- Backfill existing data
UPDATE demand_products
SET id = id; -- This will naturally fire the trigger and update the rows

