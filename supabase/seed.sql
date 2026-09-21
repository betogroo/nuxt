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