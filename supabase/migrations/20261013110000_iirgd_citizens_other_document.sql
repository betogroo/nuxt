-- Add other_document column to iirgd_citizens
ALTER TABLE public.iirgd_citizens
  ADD COLUMN other_document text;

-- Create partial unique index on other_document
CREATE UNIQUE INDEX iirgd_citizens_other_document_idx
  ON public.iirgd_citizens (other_document)
  WHERE other_document IS NOT NULL;

-- Update constraint to allow at least one document: rg, cpf, or other_document
ALTER TABLE public.iirgd_citizens
  DROP CONSTRAINT IF EXISTS iirgd_citizens_rg_cpf_check;

ALTER TABLE public.iirgd_citizens
  ADD CONSTRAINT iirgd_citizens_documents_check
  CHECK (rg IS NOT NULL OR cpf IS NOT NULL OR other_document IS NOT NULL);
