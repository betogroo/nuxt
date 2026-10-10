-- 1. Add created_by column to iirgd_citizens with foreign key to profiles and default auth.uid()
ALTER TABLE public.iirgd_citizens
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) DEFAULT auth.uid();

COMMENT ON COLUMN public.iirgd_citizens.created_by IS 'ID do perfil do usuário que realizou o cadastro inicial do cidadão';

-- 2. Ensure DEFAULT auth.uid() on iirgd_demands.created_by
ALTER TABLE public.iirgd_demands
ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 3. Create generic trigger function to populate created_by if null
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS trigger AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger BEFORE INSERT on iirgd_demands
DROP TRIGGER IF EXISTS set_created_by_iirgd_demands ON public.iirgd_demands;
CREATE TRIGGER set_created_by_iirgd_demands
BEFORE INSERT ON public.iirgd_demands
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by();

-- 5. Create trigger BEFORE INSERT on iirgd_citizens
DROP TRIGGER IF EXISTS set_created_by_iirgd_citizens ON public.iirgd_citizens;
CREATE TRIGGER set_created_by_iirgd_citizens
BEFORE INSERT ON public.iirgd_citizens
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by();
