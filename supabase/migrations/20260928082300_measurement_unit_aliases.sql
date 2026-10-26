-- Create measurement_unit_aliases table
CREATE TABLE public.measurement_unit_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.measurement_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code INTEGER UNIQUE NOT NULL,
    is_pending BOOLEAN NOT NULL DEFAULT false,
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

CREATE POLICY "Authenticated users can create pending aliases"
    ON public.measurement_unit_aliases FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Remove legacy_alias column from measurement_units
ALTER TABLE public.measurement_units DROP COLUMN IF EXISTS legacy_alias;

-- Insert seeded aliases
-- Deduplicating list:
-- 187 - Pacote 500g, 408 - Saco 5kg, 558 - Pacote 200g, 302 - Pacote 1kg, 193 - Pacote 100g, 001 - Unidade, 1368 - Lata 360ml, 120 - Frasco 500ml, 28 - Frasco 1l, 1767 - Pacote 800g, 260 - pacote 5 unidade, 201 - Pacote 100 Unidade, 505 - Pacote 1000 Unidade, 487 - Fardo 64 Rl, 33 - Pacote 500 Folha, 61 - Caixa 50 Unidade, 219 - Caixa 5000 Unidade, 36 - Cento, 210 - Pacote 50 Unidade, 38 - Caixa 100 Unidade, 96 - Caixa 500 Unidade, 1647 - Aerosol 300 ml, 220 - Caixa 72 Unidades, 191 - Pacote 8 unidades, 68 - Caixa 30 Unidade, 188 - Caixa 12 Unidade, 1559 - Rolo 305 Metro, 32 - Milheiro
INSERT INTO public.measurement_unit_aliases (code, name, unit_id)
VALUES 
    (187, 'Pacote 500g', NULL),
    (408, 'Saco 5kg', NULL),
    (558, 'Pacote 200g', NULL),
    (302, 'Pacote 1kg', NULL),
    (193, 'Pacote 100g', NULL),
    (1, 'Unidade', (SELECT id FROM public.measurement_units WHERE name = 'Unidade' LIMIT 1)),
    (1368, 'Lata 360ml', NULL),
    (120, 'Frasco 500ml', NULL),
    (28, 'Frasco 1l', NULL),
    (1767, 'Pacote 800g', NULL),
    (260, 'pacote 5 unidade', NULL),
    (201, 'Pacote 100 Unidade', NULL),
    (505, 'Pacote 1000 Unidade', NULL),
    (487, 'Fardo 64 Rl', NULL),
    (33, 'Pacote 500 Folha', NULL),
    (61, 'Caixa 50 Unidade', NULL),
    (219, 'Caixa 5000 Unidade', NULL),
    (36, 'Cento', NULL),
    (210, 'Pacote 50 Unidade', NULL),
    (38, 'Caixa 100 Unidade', NULL),
    (96, 'Caixa 500 Unidade', NULL),
    (1647, 'Aerosol 300 ml', NULL),
    (220, 'Caixa 72 Unidades', NULL),
    (191, 'Pacote 8 unidades', NULL),
    (68, 'Caixa 30 Unidade', NULL),
    (188, 'Caixa 12 Unidade', NULL),
    (1559, 'Rolo 305 Metro', NULL),
    (32, 'Milheiro', NULL)
ON CONFLICT DO NOTHING;
