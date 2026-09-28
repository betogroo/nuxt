-- Create measurement_unit_aliases table
CREATE TABLE public.measurement_unit_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.measurement_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE,
    code SERIAL UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.measurement_unit_aliases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can read aliases"
    ON public.measurement_unit_aliases FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage aliases"
    ON public.measurement_unit_aliases FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Remove legacy_alias column from measurement_units
ALTER TABLE public.measurement_units DROP COLUMN IF EXISTS legacy_alias;

-- Insert default alias for 'Unidade'
INSERT INTO public.measurement_unit_aliases (unit_id, name)
SELECT id, 'Unidade'
FROM public.measurement_units
WHERE name = 'Unidade'
ON CONFLICT DO NOTHING;
