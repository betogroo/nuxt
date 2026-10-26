-- Allow email column in public.suppliers to be nullable
ALTER TABLE public.suppliers ALTER COLUMN email DROP NOT NULL;
