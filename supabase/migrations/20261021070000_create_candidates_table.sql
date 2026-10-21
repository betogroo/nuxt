-- 1. Create candidates table with safe delete support
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  candidate_number VARCHAR(10) NOT NULL,
  photo_url TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes and Unique Constraint for candidate_number per election (active records only)
CREATE INDEX IF NOT EXISTS idx_candidates_election_id ON public.candidates(election_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_unique_number ON public.candidates(election_id, candidate_number) WHERE deleted_at IS NULL;

-- 3. Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow election authorized users to read candidates" ON public.candidates;
CREATE POLICY "Allow election authorized users to read candidates"
  ON public.candidates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election authorized users to insert candidates" ON public.candidates;
CREATE POLICY "Allow election authorized users to insert candidates"
  ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election authorized users to update candidates" ON public.candidates;
CREATE POLICY "Allow election authorized users to update candidates"
  ON public.candidates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

