-- Seed default annual product class spending ceiling for 2026 (R$ 65.492,11)
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'product_class_annual_ceilings',
  '{"2026":65492.11}',
  'Tetos anuais de gastos por classe de produtos (em R$) cadastrados ano a ano para controle de dispensa/licitação.'
)
ON CONFLICT (key) DO NOTHING;
