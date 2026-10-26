-- 1. Create candidate-photos public bucket in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-photos',
  'candidate-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- 2. Storage RLS Policies on storage.objects

-- Allow public viewing of candidate photos
DROP POLICY IF EXISTS "Public can view candidate photos" ON storage.objects;
CREATE POLICY "Public can view candidate photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-photos');

-- Allow authorized election users to upload photos
DROP POLICY IF EXISTS "Election authorized users can upload candidate photos" ON storage.objects;
CREATE POLICY "Election authorized users can upload candidate photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

-- Allow authorized election users to update candidate photos
DROP POLICY IF EXISTS "Election authorized users can update candidate photos" ON storage.objects;
CREATE POLICY "Election authorized users can update candidate photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

-- Allow authorized election users to delete candidate photos
DROP POLICY IF EXISTS "Election authorized users can delete candidate photos" ON storage.objects;
CREATE POLICY "Election authorized users can delete candidate photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );
