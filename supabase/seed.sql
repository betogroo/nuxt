-- Ensure default measurement unit exists
INSERT INTO
  public.measurement_units (name, is_active)
VALUES
  ('Unidade', true),
  ('Caixa 10 unidade', true),
  ('Pacote 100 unidade', true) ON CONFLICT (name) DO NOTHING;

-- Ensure core categories exist (in case of a fresh database reset where the migration finds 0 existing products)
INSERT INTO
  public.product_categories (name, is_active)
VALUES
  ('Papelaria', true),
  ('Escritório', true),
  ('Limpeza', true),
  ('Higiene Pessoal', true) ON CONFLICT (name) DO NOTHING;

-- Seed data for products using the new relational category_id
INSERT INTO
  public.products (name, category_id, is_active)
VALUES
  -- Papelaria
  (
    'Caneta Esferográfica Azul',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Papelaria'
    ),
    true
  ),
  (
    'Papel Sulfite A4',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Papelaria'
    ),
    true
  ),
  (
    'Clipes de Papel',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Papelaria'
    ),
    true
  ),
  (
    'Caderno Universitário',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Papelaria'
    ),
    true
  ),
  (
    'Lápis Preto HB',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Papelaria'
    ),
    true
  ),
  (
    'Borracha Branca',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Papelaria'
    ),
    true
  ),
  -- Escritório
  (
    'Grampeador',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Escritório'
    ),
    true
  ),
  (
    'Cadeira de Escritório',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Escritório'
    ),
    true
  ),
  (
    'Teclado sem fio',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Escritório'
    ),
    true
  ),
  (
    'Mouse óptico',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Escritório'
    ),
    true
  ),
  (
    'Organizador de Mesa',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Escritório'
    ),
    true
  ),
  -- Limpeza
  (
    'Desinfetante Pinho',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Limpeza'
    ),
    true
  ),
  (
    'Detergente Líquido',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Limpeza'
    ),
    true
  ),
  (
    'Sabão em Pó',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Limpeza'
    ),
    true
  ),
  (
    'Álcool 70% Líquido',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Limpeza'
    ),
    true
  ),
  (
    'Vassoura',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Limpeza'
    ),
    true
  ),
  -- Higiene Pessoal
  (
    'Sabonete Líquido',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Higiene Pessoal'
    ),
    true
  ),
  (
    'Papel Higiênico',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Higiene Pessoal'
    ),
    true
  ),
  (
    'Álcool em Gel',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Higiene Pessoal'
    ),
    true
  ),
  (
    'Creme Dental',
    (
      SELECT
        id
      FROM
        public.product_categories
      WHERE
        name = 'Higiene Pessoal'
    ),
    true
  );
-- Seed auth users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@admin.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''), ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@user.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '') ON CONFLICT (id) DO NOTHING;

-- Insert identities
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'admin@admin.com')::jsonb, 'email', NOW(), NOW(), NOW()), (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'user@user.com')::jsonb, 'email', NOW(), NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Update created profiles
UPDATE public.profiles SET role = 'admin', name = 'Administrador Teste', is_active = true WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'user', name = 'Usu�rio Comum Teste', is_active = true WHERE id = '22222222-2222-2222-2222-222222222222';

-- Seed suppliers
INSERT INTO public.suppliers (cnpj, company_name, email, responsible_name, is_simples_optant, is_active) VALUES ('12345678000199', 'Fornecedor Master Ltda', 'contato@master.com', 'Jo�o Silva', true, true), ('98765432000111', 'Distribuidora Global', 'vendas@global.com', 'Maria Souza', false, true) ON CONFLICT DO NOTHING;

