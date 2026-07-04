import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Read .env file to get Supabase credentials
const envPath = resolve(process.cwd(), '.env');
let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf8');
} catch (e) {
  console.error("❌ Could not read .env file at " + envPath);
  process.exit(1);
}

const env: Record<string, string> = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase')) {
  console.error("❌ Supabase URL and Anon Key must be configured in .env");
  process.exit(1);
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dummyAlumni = [
  {
    id: randomUUID(),
    full_name: "Md. Jahidul Kamal",
    email: "jahidul.kamal@gmail.com",
    avatar_url: null,
    graduation_year: 2022,
    major: "CSE",
    job_title: "Backend Engineer",
    company_name: "Brain Station 23",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/jahidul-kamal",
    bio: "A backend engineer passionate about building high-performance microservices and scalable systems. Experienced in Node.js, databases, and system architecture.",
    career_tips: "Master database optimization and learn how to design systems for scalability. Focus on writing clean, testable code early in your career.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Iqbal Hossain",
    email: "iqbal.hossain@gmail.com",
    avatar_url: null,
    graduation_year: 2021,
    major: "CSE",
    job_title: "Full Stack Developer",
    company_name: "Shohoz",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/iqbal-hossain",
    bio: "Full stack developer specializing in modern Javascript frameworks and responsive web design. Love solving complex user-interface challenges and optimizing web performance.",
    career_tips: "Don't just learn frameworks; understand how vanilla CSS and JavaScript work behind the scenes. Building end-to-end projects is the best way to grow.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Raisa Sultana",
    email: "raisa.sultana@gmail.com",
    avatar_url: null,
    graduation_year: 2020,
    major: "CSE",
    job_title: "Product Manager",
    company_name: "Pathao",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/raisa-sultana",
    bio: "Product manager focused on building user-centric logistics and transport solutions. Bridging the gap between design, engineering, and business strategy to deliver impact.",
    career_tips: "Develop strong communication skills and empathy for your users. Learn how to define product success using analytics and telemetry data.",
    is_verified: true,
    is_available_for_mentorship: false,
  },
  {
    id: randomUUID(),
    full_name: "Tanvir Ahmed",
    email: "tanvir.ahmed@gmail.com",
    avatar_url: null,
    graduation_year: 2021,
    major: "EEE",
    job_title: "IoT Engineer",
    company_name: "Samsung R&D Bangladesh",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/tanvir-ahmed-iot",
    bio: "IoT engineer developing smart home solutions and embedded systems. Focused on wireless sensor networks, firmware development, and hardware-software integration.",
    career_tips: "Get your hands dirty with hardware protocols like I2C, SPI, and UART. Bridge the gap by learning C/C++ alongside hardware design.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Nusrat Jahan",
    email: "nusrat.jahan@gmail.com",
    avatar_url: null,
    graduation_year: 2022,
    major: "EEE",
    job_title: "Power Systems Engineer",
    company_name: "BPDB",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/nusrat-jahan-power",
    bio: "Electrical engineer managing power grid distribution and optimization projects. Committed to sustainable energy solutions and grid stability in national networks.",
    career_tips: "Gain strong command over grid simulation software like ETAP or MATLAB. Safety protocols and practical field knowledge are key in power systems engineering.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Arif Hasan",
    email: "arif.hasan@gmail.com",
    avatar_url: null,
    graduation_year: 2020,
    major: "BBA",
    job_title: "Business Analyst",
    company_name: "Dutch-Bangla Bank",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/arif-hasan-ba",
    bio: "Business analyst translating financial data into actionable insights for retail banking. Specializing in market research, risk assessment, and financial modeling.",
    career_tips: "Become highly proficient in Excel, SQL, and data visualization tools like Power BI. Learn the domain inside-out to add real business value.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Sadia Islam",
    email: "sadia.islam@gmail.com",
    avatar_url: null,
    graduation_year: 2021,
    major: "BBA",
    job_title: "Marketing Manager",
    company_name: "Unilever Bangladesh",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/sadia-islam-mkt",
    bio: "Creative marketer leading consumer brand strategies and digital campaigns. Experienced in market positioning, branding, and digital media analytics.",
    career_tips: "Stay curious about consumer psychology and digital trends. Data-driven marketing is the future, so learn how to analyze campaign performance metrics.",
    is_verified: true,
    is_available_for_mentorship: false,
  },
  {
    id: randomUUID(),
    full_name: "Rakib Hasan",
    email: "rakib.hasan@gmail.com",
    avatar_url: null,
    graduation_year: 2019,
    major: "CSE",
    job_title: "Data Scientist",
    company_name: "Grameenphone",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/rakib-hasan-ds",
    bio: "Data scientist building machine learning models for customer analytics and telecommunication insights. Focused on predictive analytics, statistical modeling, and big data.",
    career_tips: "Solidify your math and statistics fundamentals before jumping into libraries. Work on handling real-world, noisy datasets rather than clean tutorial ones.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Mithila Chowdhury",
    email: "mithila.chowdhury@gmail.com",
    avatar_url: null,
    graduation_year: 2022,
    major: "CSE",
    job_title: "UI/UX Designer",
    company_name: "Kaz Software",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/mithila-chowdhury",
    bio: "Designer crafting intuitive user interfaces and memorable digital products. Passionate about user research, wireframing, interactive prototyping, and design systems.",
    career_tips: "Build a strong portfolio highlighting your design decisions, not just aesthetic layouts. Learn to collaborate closely with engineers to ensure feasibility.",
    is_verified: true,
    is_available_for_mentorship: true,
  },
  {
    id: randomUUID(),
    full_name: "Sabbir Rahman",
    email: "sabbir.rahman@gmail.com",
    avatar_url: null,
    graduation_year: 2020,
    major: "Other",
    job_title: "Cybersecurity Analyst",
    company_name: "CIRT Bangladesh",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com/in/sabbir-rahman-sec",
    bio: "Cybersecurity analyst defending critical infrastructure from cyber threats. Specializing in threat intelligence, incident response, and vulnerability assessments.",
    career_tips: "Get hands-on experience by participating in CTF competitions. Standard certifications like CompTIA Security+ or CEH are great for getting started.",
    is_verified: true,
    is_available_for_mentorship: true,
  }
];

async function seed() {
  console.log("Seeding 10 dummy alumni profiles...");
  
  // We insert them all at once
  const { data, error } = await supabase
    .from('alumni_profiles')
    .insert(dummyAlumni)
    .select();

  if (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data?.length || 0} alumni profiles!`);
  process.exit(0);
}

seed();
