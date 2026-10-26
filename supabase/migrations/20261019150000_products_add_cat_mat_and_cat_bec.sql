-- Add cat_mat and cat_bec columns to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cat_mat bigint NULL,
  ADD COLUMN IF NOT EXISTS cat_bec bigint NULL;

-- Unique constraints for non-null cat_mat and cat_bec
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_cat_mat_key'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_cat_mat_key UNIQUE (cat_mat);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_cat_bec_key'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_cat_bec_key UNIQUE (cat_bec);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_cat_mat_positive'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_cat_mat_positive CHECK (cat_mat IS NULL OR cat_mat > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_cat_bec_positive'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_cat_bec_positive CHECK (cat_bec IS NULL OR cat_bec > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.products.cat_mat IS 'Código CATMAT (SIASG / Compras.gov.br)';
COMMENT ON COLUMN public.products.cat_bec IS 'Código CATBEC (Bolsa Eletrônica de Compras - SP)';
