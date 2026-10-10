CREATE TABLE public.iirgd_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_days integer NOT NULL DEFAULT 10,
  delay_days integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.iirgd_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica para autenticados" ON public.iirgd_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Edicao para admins e managers" ON public.iirgd_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'iirgd_manager')
  );

INSERT INTO public.iirgd_settings (alert_days, delay_days) VALUES (10, 15);

