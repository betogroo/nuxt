-- Migration: Add soft delete (deleted_at) to public.demands
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial index for active (non-deleted) demands
CREATE INDEX IF NOT EXISTS idx_demands_deleted_at
ON public.demands(deleted_at)
WHERE deleted_at IS NULL;
