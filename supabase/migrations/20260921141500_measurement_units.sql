-- 1. Create measurement_units table
CREATE TABLE public.measurement_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    legacy_alias TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for measurement_units
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active units"
    ON public.measurement_units FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Admin can full manage units"
    ON public.measurement_units FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 2. Create product_units table
CREATE TABLE public.product_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.measurement_units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, unit_id)
);

ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read product units"
    ON public.product_units FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage product units"
    ON public.product_units FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 3. Modify demand_products table
-- Drop unique constraint on demand_id, product_id
ALTER TABLE public.demand_products DROP CONSTRAINT IF EXISTS demand_products_demand_id_product_id_key;

-- Add unit_id column
ALTER TABLE public.demand_products ADD COLUMN unit_id UUID REFERENCES public.measurement_units(id) ON DELETE RESTRICT;

ALTER TABLE public.demand_products ALTER COLUMN unit_id SET NOT NULL;

-- Create unique constraint including unit_id
ALTER TABLE public.demand_products ADD CONSTRAINT demand_products_unique_item UNIQUE (demand_id, product_id, unit_id);

-- Keep id as primary key, it's easier for the frontend (which already uses it for update/delete).

-- 4. Trigger to auto-assign 'Unidade' to new products
CREATE OR REPLACE FUNCTION public.assign_default_unit_to_product()
RETURNS TRIGGER AS $$
DECLARE
    v_unidade_id UUID;
BEGIN
    -- Obter o ID da unidade padrao 'Unidade'
    SELECT id INTO v_unidade_id FROM public.measurement_units WHERE name = 'Unidade' LIMIT 1;
    
    -- Se a unidade existir, insere o vinculo
    IF v_unidade_id IS NOT NULL THEN
        INSERT INTO public.product_units (product_id, unit_id) VALUES (NEW.id, v_unidade_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_product_created
    AFTER INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.assign_default_unit_to_product();

-- Create trigger for updated_at on measurement_units
CREATE TRIGGER measurement_units_set_updated_at
    BEFORE UPDATE ON public.measurement_units
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
