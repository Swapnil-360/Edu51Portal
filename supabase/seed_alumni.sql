-- Create alumni_profiles table (standalone UUID PRIMARY KEY, no strict FK)
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
    id UUID PRIMARY KEY,
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

-- Enable Row Level Security
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate Policies
DROP POLICY IF EXISTS "Anyone can read verified alumni" ON public.alumni_profiles;
CREATE POLICY "Anyone can read verified alumni" 
ON public.alumni_profiles 
FOR SELECT 
USING (is_verified = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own alumni profile" ON public.alumni_profiles;
CREATE POLICY "Users can insert own alumni profile" 
ON public.alumni_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own alumni profile" ON public.alumni_profiles;
CREATE POLICY "Users can update own alumni profile" 
ON public.alumni_profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Trigger function for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_alumni_profiles_updated_at ON public.alumni_profiles;
CREATE TRIGGER update_alumni_profiles_updated_at
    BEFORE UPDATE ON public.alumni_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clear out any existing entries to prevent duplicate primary key violations on repeated runs
TRUNCATE TABLE public.alumni_profiles;

-- Insert 10 verified dummy alumni profiles
INSERT INTO public.alumni_profiles (
    id, full_name, email, avatar_url, graduation_year, major, 
    current_role, current_company, location, linkedin_url, bio, 
    career_tips, is_verified, is_available_for_mentorship
) VALUES
(
    '81a00384-915c-4807-87c6-7bbf1a552e8a',
    'Md. Jahidul Kamal',
    'jahidul.kamal@gmail.com',
    NULL,
    2022,
    'CSE',
    'Backend Engineer',
    'Brain Station 23',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/jahidul-kamal',
    'A backend engineer passionate about building high-performance microservices and scalable systems. Experienced in Node.js, databases, and system architecture.',
    'Master database optimization and learn how to design systems for scalability. Focus on writing clean, testable code early in your career.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e8b',
    'Iqbal Hossain',
    'iqbal.hossain@gmail.com',
    NULL,
    2021,
    'CSE',
    'Full Stack Developer',
    'Shohoz',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/iqbal-hossain',
    'Full stack developer specializing in modern Javascript frameworks and responsive web design. Love solving complex user-interface challenges and optimizing web performance.',
    'Don''t just learn frameworks; understand how vanilla CSS and JavaScript work behind the scenes. Building end-to-end projects is the best way to grow.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e8c',
    'Raisa Sultana',
    'raisa.sultana@gmail.com',
    NULL,
    2020,
    'CSE',
    'Product Manager',
    'Pathao',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/raisa-sultana',
    'Product manager focused on building user-centric logistics and transport solutions. Bridging the gap between design, engineering, and business strategy to deliver impact.',
    'Develop strong communication skills and empathy for your users. Learn how to define product success using analytics and telemetry data.',
    TRUE,
    FALSE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e8d',
    'Tanvir Ahmed',
    'tanvir.ahmed@gmail.com',
    NULL,
    2021,
    'EEE',
    'IoT Engineer',
    'Samsung R&D Bangladesh',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/tanvir-ahmed-iot',
    'IoT engineer developing smart home solutions and embedded systems. Focused on wireless sensor networks, firmware development, and hardware-software integration.',
    'Get your hands dirty with hardware protocols like I2C, SPI, and UART. Bridge the gap by learning C/C++ alongside hardware design.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e8e',
    'Nusrat Jahan',
    'nusrat.jahan@gmail.com',
    NULL,
    2022,
    'EEE',
    'Power Systems Engineer',
    'BPDB',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/nusrat-jahan-power',
    'Electrical engineer managing power grid distribution and optimization projects. Committed to sustainable energy solutions and grid stability in national networks.',
    'Gain strong command over grid simulation software like ETAP or MATLAB. Safety protocols and practical field knowledge are key in power systems engineering.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e8f',
    'Arif Hasan',
    'arif.hasan@gmail.com',
    NULL,
    2020,
    'BBA',
    'Business Analyst',
    'Dutch-Bangla Bank',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/arif-hasan-ba',
    'Business analyst translating financial data into actionable insights for retail banking. Specializing in market research, risk assessment, and financial modeling.',
    'Become highly proficient in Excel, SQL, and data visualization tools like Power BI. Learn the domain inside-out to add real business value.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e90',
    'Sadia Islam',
    'sadia.islam@gmail.com',
    NULL,
    2021,
    'BBA',
    'Marketing Manager',
    'Unilever Bangladesh',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/sadia-islam-mkt',
    'Creative marketer leading consumer brand strategies and digital campaigns. Experienced in market positioning, branding, and digital media analytics.',
    'Stay curious about consumer psychology and digital trends. Data-driven marketing is the future, so learn how to analyze campaign performance metrics.',
    TRUE,
    FALSE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e91',
    'Rakib Hasan',
    'rakib.hasan@gmail.com',
    NULL,
    2019,
    'CSE',
    'Data Scientist',
    'Grameenphone',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/rakib-hasan-ds',
    'Data scientist building machine learning models for customer analytics and telecommunication insights. Focused on predictive analytics, statistical modeling, and big data.',
    'Solidify your math and statistics fundamentals before jumping into libraries. Work on handling real-world, noisy datasets rather than clean tutorial ones.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e92',
    'Mithila Chowdhury',
    'mithila.chowdhury@gmail.com',
    NULL,
    2022,
    'CSE',
    'UI/UX Designer',
    'Kaz Software',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/mithila-chowdhury',
    'Designer crafting intuitive user interfaces and memorable digital products. Passionate about user research, wireframing, interactive prototyping, and design systems.',
    'Build a strong portfolio highlighting your design decisions, not just aesthetic layouts. Learn to collaborate closely with engineers to ensure feasibility.',
    TRUE,
    TRUE
),
(
    '81a00384-915c-4807-87c6-7bbf1a552e93',
    'Sabbir Rahman',
    'sabbir.rahman@gmail.com',
    NULL,
    2020,
    'Other',
    'Cybersecurity Analyst',
    'CIRT Bangladesh',
    'Dhaka, Bangladesh',
    'https://linkedin.com/in/sabbir-rahman-sec',
    'Cybersecurity analyst defending critical infrastructure from cyber threats. Specializing in threat intelligence, incident response, and vulnerability assessments.',
    'Get hands-on experience by participating in CTF competitions. Standard certifications like CompTIA Security+ or CEH are great for getting started.',
    TRUE,
    TRUE
);
