-- Add new columns to alumni_profiles table to support comprehensive signup fields
ALTER TABLE public.alumni_profiles
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS dept TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS id_card_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create storage bucket for alumni-ids if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('alumni-ids', 'alumni-ids', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY alumniids_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'alumni-ids');
CREATE POLICY alumniids_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'alumni-ids' AND (storage.foldername(name))[1] = auth.uid()::text);
