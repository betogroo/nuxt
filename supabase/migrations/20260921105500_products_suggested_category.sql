-- Insert "Outros" category if it doesn't exist
INSERT INTO public.product_categories (name, is_active) 
VALUES ('Outros', true) 
ON CONFLICT (name) DO NOTHING;

-- Add suggested_category column to products
ALTER TABLE public.products ADD COLUMN suggested_category text NULL;
