-- 1. Ensure 'Unidade' exists in measurement_units
INSERT INTO public.measurement_units (name, is_active, is_pending)
VALUES ('Unidade', true, false)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 2. Link alias code 1 ('Unidade') to the official 'Unidade' measurement unit
UPDATE public.measurement_unit_aliases
SET unit_id = (SELECT id FROM public.measurement_units WHERE LOWER(name) = 'unidade' LIMIT 1)
WHERE code = 1 AND unit_id IS NULL;

-- 3. Enhance assign_default_unit_to_product function to be completely self-healing and idempotent
CREATE OR REPLACE FUNCTION public.assign_default_unit_to_product()
RETURNS TRIGGER AS $$
DECLARE
    v_unidade_id UUID;
BEGIN
    -- Search for default unit 'Unidade' (case-insensitive)
    SELECT id INTO v_unidade_id 
    FROM public.measurement_units 
    WHERE LOWER(name) = 'unidade' 
    LIMIT 1;
    
    -- If it does not exist, create it automatically
    IF v_unidade_id IS NULL THEN
        INSERT INTO public.measurement_units (name, is_active, is_pending)
        VALUES ('Unidade', true, false)
        ON CONFLICT (name) DO UPDATE SET is_active = true
        RETURNING id INTO v_unidade_id;
    END IF;
    
    -- Insert link in product_units (idempotent)
    IF v_unidade_id IS NOT NULL THEN
        INSERT INTO public.product_units (product_id, unit_id)
        VALUES (NEW.id, v_unidade_id)
        ON CONFLICT (product_id, unit_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it is properly attached
DROP TRIGGER IF EXISTS on_product_created ON public.products;
CREATE TRIGGER on_product_created
    AFTER INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.assign_default_unit_to_product();

-- 4. Backfill any existing products that do not have 'Unidade' linked in product_units
DO $$
DECLARE
    v_def_id UUID;
BEGIN
    SELECT id INTO v_def_id FROM public.measurement_units WHERE LOWER(name) = 'unidade' LIMIT 1;
    IF v_def_id IS NOT NULL THEN
        INSERT INTO public.product_units (product_id, unit_id)
        SELECT p.id, v_def_id
        FROM public.products p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.product_units pu 
            WHERE pu.product_id = p.id AND pu.unit_id = v_def_id
        )
        ON CONFLICT (product_id, unit_id) DO NOTHING;
    END IF;
END $$;
