-- Migration: 20261021100000_create_ballot_boxes_table.sql
-- Description: Create ballot_boxes table for virtual ballot box management with safe delete and realtime publication.

-- 1. Create ballot_boxes table
CREATE TABLE IF NOT EXISTS public.ballot_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance & filtering indexes
CREATE INDEX IF NOT EXISTS idx_ballot_boxes_election_id ON public.ballot_boxes(election_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ballot_boxes_is_active ON public.ballot_boxes(is_active) WHERE deleted_at IS NULL;

-- 3. Enable Row Level Security
ALTER TABLE public.ballot_boxes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow election authorized users to read ballot boxes" ON public.ballot_boxes;
CREATE POLICY "Allow election authorized users to read ballot boxes"
  ON public.ballot_boxes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election managers and admins to insert ballot boxes" ON public.ballot_boxes;
CREATE POLICY "Allow election managers and admins to insert ballot boxes"
  ON public.ballot_boxes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election')
    )
  );

DROP POLICY IF EXISTS "Allow election managers and admins to update ballot boxes" ON public.ballot_boxes;
CREATE POLICY "Allow election managers and admins to update ballot boxes"
  ON public.ballot_boxes FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Allow election managers and admins to delete ballot boxes" ON public.ballot_boxes;
CREATE POLICY "Allow election managers and admins to delete ballot boxes"
  ON public.ballot_boxes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election')
    )
  );

-- 5. Grant permissions
GRANT ALL ON TABLE public.ballot_boxes TO authenticated, service_role;
GRANT SELECT ON TABLE public.ballot_boxes TO anon;

-- 6. Enable Realtime on ballot_boxes
ALTER TABLE public.ballot_boxes REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'ballot_boxes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ballot_boxes;
  END IF;
END $$;
