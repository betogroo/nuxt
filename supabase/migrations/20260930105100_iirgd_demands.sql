CREATE TABLE public.iirgd_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code varchar(20) NOT NULL,
  rg varchar(12) NOT NULL,
  cpf varchar(14) NOT NULL,
  name varchar(255) NOT NULL,
  observation text,
  status varchar(100) NOT NULL DEFAULT 'Novo',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Configuration
ALTER TABLE public.iirgd_demands ENABLE ROW LEVEL SECURITY;

-- Allow only 'admin' and 'iirgd' to access and modify this table
CREATE POLICY "Admin and IIRGD full access on iirgd_demands"
ON public.iirgd_demands
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'iirgd')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'iirgd')
);

-- Trigger to automatically set updated_at
CREATE TRIGGER set_updated_at_iirgd_demands
BEFORE UPDATE ON public.iirgd_demands
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Grant Privileges
GRANT ALL ON TABLE public.iirgd_demands TO authenticated;
GRANT ALL ON TABLE public.iirgd_demands TO service_role;
