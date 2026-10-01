-- 1. Create table product_classes
CREATE TABLE IF NOT EXISTS public.product_classes (
    id VARCHAR(20) PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_pending BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.product_classes;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.product_classes
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 3. RLS
ALTER TABLE public.product_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read all product classes" ON public.product_classes;
CREATE POLICY "Everyone can read all product classes"
    ON public.product_classes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated can suggest product classes" ON public.product_classes;
CREATE POLICY "Authenticated can suggest product classes"
    ON public.product_classes FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (is_pending = true AND is_active = false));

DROP POLICY IF EXISTS "Admin can full manage product classes" ON public.product_classes;
CREATE POLICY "Admin can full manage product classes"
    ON public.product_classes FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_classes TO service_role;

-- 5. Add product_class_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_class_id VARCHAR(20) REFERENCES public.product_classes(id);

-- 6. Seed product classes
INSERT INTO public.product_classes (id, name, is_active, is_pending) VALUES
('5915', 'Filtros e redes', true, false),
('6130', 'Conversores elétricos estáticos', true, false),
('6140', 'Baterias Recarregáveis', true, false),
('6240', 'Lâmpadas Elétricas', true, false),
('6532', 'Vestuário hospitalar e cirúrgico e itens correlatos de finalidades especiais', true, false),
('6840', 'Pesticidas e Desinfetantes', true, false),
('6850', 'Especialidades químicas diversas', true, false),
('7060', 'Peças e acessórios para computadores', true, false),
('7090', 'Suprimentos de informática - TIC', true, false),
('7210', 'Utensílios Domésticos', true, false),
('7240', 'Recipientes para uso doméstico e comercial', true, false),
('7330', 'Utensílios e ferramentas manuais de cozinha', true, false),
('7350', 'Louça e artigos de mesa', true, false),
('7510', 'Artigos para Escritório', true, false),
('7520', 'Acessórios e Dispositivos para Escritório', true, false),
('7540', 'Formulários Padronizados', true, false),
('7920', 'Vassouras, escovas, rodos, esponjas e esfregões', true, false),
('7930', 'Compostos e preparados para limpeza e polimento', true, false),
('8105', 'Sacos e Bolsas', true, false),
('8520', 'Sabonetes, artigos para barbear e dentifrícios', true, false),
('8540', 'Artigos de papel para higiene', true, false),
('8920', 'Produtos de panificação e cereais', true, false),
('8925', 'Açúcar, confeitos, castanhas nozes e similares', true, false),
('8955', 'Café, chá e chocolate', true, false),
('9140', 'Óleos Combustíveis', true, false),
('9310', 'Papéis e Papelões', true, false),
('7530', 'Formulários Oficiais', true, false),
('8040', 'Adesivos', true, false),
('8530', 'Artigos para higiene pessoal', true, false),
('7080', 'Peças, acessórios e ferramentas para redes de tic', true, false),
('4120', 'Aparelho de Ar Condicionado', true, false),
('9330', 'Artigos de Plástico', true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  is_pending = EXCLUDED.is_pending;
