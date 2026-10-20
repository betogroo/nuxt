-- Migration: 20261020170000_create_elections_table.sql
-- Description: Create election_status enum and elections table with soft delete (deleted_at) and RLS.

-- 1. Create election_status enum
DO $$ BEGIN
  CREATE TYPE public.election_status AS ENUM (
    'awaiting_release',
    'released',
    'tallying',
    'finished'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create elections table
CREATE TABLE IF NOT EXISTS public.elections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  election_date timestamptz NOT NULL,
  digits_count integer NOT NULL DEFAULT 2 CHECK (digits_count >= 1 AND digits_count <= 6),
  is_uppercase boolean NOT NULL DEFAULT false,
  status public.election_status NOT NULL DEFAULT 'awaiting_release',
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz DEFAULT NULL
);

-- 3. Indexes for performance and safe delete
CREATE INDEX IF NOT EXISTS idx_elections_deleted_at ON public.elections(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_elections_status ON public.elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_election_date ON public.elections(election_date);

-- 4. Enable Row Level Security
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Allow election authorized users to read elections" ON public.elections;
CREATE POLICY "Allow election authorized users to read elections"
  ON public.elections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user-election', 'manager-election', 'admin-election')
    )
  );

DROP POLICY IF EXISTS "Allow election managers and admins to insert elections" ON public.elections;
CREATE POLICY "Allow election managers and admins to insert elections"
  ON public.elections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election')
    )
  );

DROP POLICY IF EXISTS "Allow election managers and admins to update elections" ON public.elections;
CREATE POLICY "Allow election managers and admins to update elections"
  ON public.elections FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election')
    )
  );

-- Grant privileges
GRANT ALL ON TABLE public.elections TO authenticated, service_role;
GRANT SELECT ON TABLE public.elections TO anon;

-- 6. Insert sample seed elections for initial testing
INSERT INTO public.elections (id, name, election_date, digits_count, is_uppercase, status, description, created_by)
VALUES 
  (
    'e1111111-1111-1111-1111-111111111111',
    'Eleição Grêmio Estudantil 2026',
    now() + interval '5 days',
    2,
    true,
    'released',
    'Eleição para os representantes de turma e grêmio estudantil do ano letivo de 2026.',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'Conselho Escolar - Gestão 2027/2028',
    now() + interval '30 days',
    2,
    false,
    'awaiting_release',
    'Eleição bienal para membros do conselho escolar e representantes da comunidade.',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'Comissão Interna de Prevenção de Acidentes 2025',
    now() - interval '60 days',
    2,
    false,
    'finished',
    'Eleição dos representantes dos servidores da CIPA realizada e homologada.',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;
