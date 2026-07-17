-- Add phone_number column to alumni_profiles table
ALTER TABLE public.alumni_profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
