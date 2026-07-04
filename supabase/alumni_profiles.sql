-- Create alumni_profiles table
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    graduation_year INT NOT NULL,
    major TEXT NOT NULL,
    current_role TEXT,
    current_company TEXT,
    location TEXT,
    linkedin_url TEXT,
    bio TEXT,
    career_tips TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_available_for_mentorship BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read verified alumni profiles, and users can read their own profiles (even if unverified)
CREATE POLICY "Anyone can read verified alumni" 
ON public.alumni_profiles 
FOR SELECT 
USING (is_verified = true OR auth.uid() = id);

-- Policy 2: Authenticated users can insert their own profile
CREATE POLICY "Users can insert own alumni profile" 
ON public.alumni_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own alumni profile" 
ON public.alumni_profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Set up updated_at trigger helper function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update trigger
DROP TRIGGER IF EXISTS update_alumni_profiles_updated_at ON public.alumni_profiles;
CREATE TRIGGER update_alumni_profiles_updated_at
    BEFORE UPDATE ON public.alumni_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
