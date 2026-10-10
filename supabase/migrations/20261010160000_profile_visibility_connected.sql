-- Migration: Add 'connected' to profiles visibility check constraint
-- and update the profile_visible function to support connections-only visibility.

-- 1. Drop existing check constraint and add updated constraint allowing 'connected'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_visibility_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_visibility_check 
  CHECK (visibility IN ('public', 'connected', 'users', 'private'));

-- 2. Update existing legacy 'users' visibility to 'public'
UPDATE public.profiles SET visibility = 'public' WHERE visibility = 'users';

-- 3. Update profile_visible function to allow access when connected
CREATE OR REPLACE FUNCTION public.profile_visible(owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT owner = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = owner
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'users' AND auth.uid() IS NOT NULL)
        OR (p.visibility = 'connected' AND public.are_connected(owner, auth.uid()))
      )
  );
$$;
