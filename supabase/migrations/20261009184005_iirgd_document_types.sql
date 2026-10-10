-- Create table for IIRGD Document Types
CREATE TABLE public.iirgd_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  is_pending boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Configuration
ALTER TABLE public.iirgd_document_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow all authenticated users to read iirgd_document_types"
ON public.iirgd_document_types
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert pending document types
CREATE POLICY "Allow authenticated users to insert pending iirgd_document_types"
ON public.iirgd_document_types
FOR INSERT
TO authenticated
WITH CHECK (is_pending = true);

-- Allow admins to manage all document types
CREATE POLICY "Admins can manage iirgd_document_types"
ON public.iirgd_document_types
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Trigger to automatically set updated_at
CREATE TRIGGER set_updated_at_iirgd_document_types
BEFORE UPDATE ON public.iirgd_document_types
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Grant Privileges
GRANT ALL ON TABLE public.iirgd_document_types TO authenticated;
GRANT ALL ON TABLE public.iirgd_document_types TO service_role;

-- Seed initial data
INSERT INTO public.iirgd_document_types (name, is_active, is_pending) VALUES
  ('Primeira Via', true, false),
  ('Primeira Via Entintada', true, false),
  ('Primeira Via CIN', true, false),
  ('Segunda Via', true, false),
  ('Segunda Via Taxa', true, false),
  ('Segunda Via CIN', true, false),
  ('Segunda Via Entintada', true, false),
  ('Antecedentes Nominal', true, false),
  ('Antecedentes Numeral', true, false);

-- Add document_type_id to iirgd_demands
ALTER TABLE public.iirgd_demands
  ADD COLUMN document_type_id uuid REFERENCES public.iirgd_document_types(id);

-- Update RLS for iirgd_demands if necessary (usually not needed for just a column addition,
-- but the front-end will send document_type_id during insert)
