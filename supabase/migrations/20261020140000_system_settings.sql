-- Create system_settings table for configurable parameters
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings
DROP POLICY IF EXISTS "Allow authenticated read system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated read system_settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

-- Only admins can insert or update settings
DROP POLICY IF EXISTS "Allow admin modify system_settings" ON public.system_settings;
CREATE POLICY "Allow admin modify system_settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Insert default BEC URL if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'bec_catalog_url',
  'https://www.bec.sp.gov.br/BEC_Catalogo_ui/CatalogDetalheNovo.aspx?chave=&cod_id=',
  'URL base do catálogo BEC para redirecionamento direto aos produtos.'
)
ON CONFLICT (key) DO NOTHING;

-- Grant privileges
GRANT ALL ON TABLE public.system_settings TO authenticated, service_role;
GRANT SELECT ON TABLE public.system_settings TO anon;
