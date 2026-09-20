-- Seed data for products

INSERT INTO public.products (name, material_category, is_active)
VALUES
  -- Papelaria
  ('Caneta Esferográfica Azul', 'Papelaria', true),
  ('Papel Sulfite A4', 'Papelaria', true),
  ('Clipes de Papel', 'Papelaria', true),
  ('Caderno Universitário', 'Papelaria', true),
  ('Lápis Preto HB', 'Papelaria', true),
  ('Borracha Branca', 'Papelaria', true),
  
  -- Escritório
  ('Grampeador', 'Escritório', true),
  ('Cadeira de Escritório', 'Escritório', true),
  ('Teclado sem fio', 'Escritório', true),
  ('Mouse óptico', 'Escritório', true),
  ('Organizador de Mesa', 'Escritório', true),
  
  -- Limpeza
  ('Desinfetante Pinho', 'Limpeza', true),
  ('Detergente Líquido', 'Limpeza', true),
  ('Sabão em Pó', 'Limpeza', true),
  ('Álcool 70% Líquido', 'Limpeza', true),
  ('Vassoura', 'Limpeza', true),
  
  -- Higiene Pessoal
  ('Sabonete Líquido', 'Higiene Pessoal', true),
  ('Papel Higiênico', 'Higiene Pessoal', true),
  ('Álcool em Gel', 'Higiene Pessoal', true),
  ('Creme Dental', 'Higiene Pessoal', true);
