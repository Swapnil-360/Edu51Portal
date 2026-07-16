import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { sanitizeIlikeTerm } from '../lib/sanitize';
import { AlumniProfile } from '../types/social';

export const MOCK_ALUMNI: AlumniProfile[] = [
  {
    id: "mock-alumni-1",
    full_name: "Tariqul Islam",
    email: "tariqul@gmail.com",
    avatar_url: null,
    graduation_year: 2024,
    major: "CSE",
    job_title: "Software Engineer",
    company_name: "Google",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com",
    bio: "Passionate software engineer focused on building scalable web apps.",
    career_tips: "Focus on fundamentals (DSA) and build personal projects.",
    is_verified: true,
    is_available_for_mentorship: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    skills: ["React", "TypeScript", "System Design"],
    achievements: [],
    portfolio_url: null,
    social_links: {},
    contact_mode: "website",
  },
  {
    id: "mock-alumni-2",
    full_name: "Sadia Rahman",
    email: "sadia@gmail.com",
    avatar_url: null,
    graduation_year: 2023,
    major: "EEE",
    job_title: "Hardware Design Engineer",
    company_name: "Intel",
    city: "Austin, USA",
    linkedin_url: "https://linkedin.com",
    bio: "Designing the next generation of processors.",
    career_tips: "Get hands-on experience with FPGA and microcontrollers early on.",
    is_verified: true,
    is_available_for_mentorship: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    skills: ["Verilog", "FPGA", "Embedded Systems"],
    achievements: [],
    portfolio_url: null,
    social_links: {},
    contact_mode: "website",
  },
  {
    id: "mock-alumni-3",
    full_name: "Mahmudul Hasan",
    email: "mahmudul@gmail.com",
    avatar_url: null,
    graduation_year: 2022,
    major: "BBA",
    job_title: "Product Manager",
    company_name: "Pathao",
    city: "Dhaka, Bangladesh",
    linkedin_url: "https://linkedin.com",
    bio: "Loves analyzing consumer behavior and building products.",
    career_tips: "Develop empathy for users and learn to read product analytics.",
    is_verified: true,
    is_available_for_mentorship: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    skills: ["Product Strategy", "Analytics"],
    achievements: [],
    portfolio_url: null,
    social_links: {},
    contact_mode: "website",
  }
];

export interface AlumniFilters {
  major?: string;
  search?: string;
  mentorshipOnly?: boolean;
  graduationYear?: number;
  company?: string;
  skills?: string[];
}

export function useAlumni(filters?: AlumniFilters) {
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabaseConfigured) {
        // Mock fallback mode
        let data = [...MOCK_ALUMNI];
        if (filters) {
          if (filters.major && filters.major !== 'All') {
            if (filters.major === 'Other') {
              data = data.filter((a) => !['CSE', 'EEE', 'BBA', 'TEXTILE', 'CIVIL'].includes(a.major.toUpperCase()));
            } else {
              data = data.filter((a) => a.major.toLowerCase() === filters.major!.toLowerCase());
            }
          }
          if (filters.mentorshipOnly) {
            data = data.filter((a) => a.is_available_for_mentorship);
          }
          if (filters.graduationYear) {
            data = data.filter((a) => a.graduation_year === filters.graduationYear);
          }
          if (filters.company && filters.company.trim()) {
            const companyLower = filters.company.trim().toLowerCase();
            data = data.filter((a) => a.company_name && a.company_name.toLowerCase().includes(companyLower));
          }
          if (filters.skills && filters.skills.length > 0) {
            const wanted = filters.skills.map((s) => s.toLowerCase());
            data = data.filter((a) => a.skills?.some((s) => wanted.includes(s.toLowerCase())));
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            data = data.filter(
              (a) =>
                a.full_name.toLowerCase().includes(searchLower) ||
                (a.job_title && a.job_title.toLowerCase().includes(searchLower)) ||
                (a.company_name && a.company_name.toLowerCase().includes(searchLower))
            );
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        setAlumni(data);
      } else {
        // Supabase DB fetch
        let query = supabase
          .from('alumni_profiles')
          .select('id, full_name, email, avatar_url, graduation_year, major, job_title, company_name, city, linkedin_url, bio, career_tips, is_verified, is_available_for_mentorship, created_at, updated_at, skills, achievements, portfolio_url, social_links, contact_mode')
          .eq('is_verified', true);

        if (filters) {
          if (filters.major && filters.major !== 'All') {
            if (filters.major === 'Other') {
              query = query.not('major', 'in', '("CSE","EEE","BBA","Textile","Civil")');
            } else {
              query = query.eq('major', filters.major);
            }
          }
          if (filters.mentorshipOnly) {
            query = query.eq('is_available_for_mentorship', true);
          }
          if (filters.graduationYear) {
            query = query.eq('graduation_year', filters.graduationYear);
          }
          if (filters.company && filters.company.trim()) {
            const companyVal = sanitizeIlikeTerm(filters.company.trim());
            query = query.ilike('company_name', `%${companyVal}%`);
          }
          if (filters.skills && filters.skills.length > 0) {
            query = query.overlaps('skills', filters.skills);
          }
          if (filters.search && filters.search.trim()) {
            const searchVal = sanitizeIlikeTerm(filters.search.trim());
            query = query.or(
              `full_name.ilike.%${searchVal}%,job_title.ilike.%${searchVal}%,company_name.ilike.%${searchVal}%`
            );
          }
        }

        query = query.order('created_at', { ascending: false });

        const { data, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        setAlumni(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching alumni:', err);
      setError(err?.message || 'Failed to fetch alumni profiles');
    } finally {
      setLoading(false);
    }
  }, [
    filters?.major,
    filters?.search,
    filters?.mentorshipOnly,
    filters?.graduationYear,
    filters?.company,
    filters?.skills?.join(','),
  ]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  return { alumni, loading, error, refetch: fetchAlumni };
}

export function useAlumniById(id: string) {
  const [alumni, setAlumni] = useState<AlumniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchSingleAlumni = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!supabaseConfigured) {
          const found = MOCK_ALUMNI.find((a) => a.id === id) || null;
          await new Promise((resolve) => setTimeout(resolve, 200));
          setAlumni(found);
        } else {
          const { data, error: fetchErr } = await supabase
            .from('alumni_profiles')
            .select('id, full_name, email, avatar_url, graduation_year, major, job_title, company_name, city, linkedin_url, bio, career_tips, is_verified, is_available_for_mentorship, created_at, updated_at, skills, achievements, portfolio_url, social_links, contact_mode')
            .eq('id', id)
            .single();
          if (fetchErr) throw fetchErr;
          setAlumni(data);
        }
      } catch (err: any) {
        console.error('Error fetching single alumni profile:', err);
        setError(err?.message || 'Failed to load alumni profile');
      } finally {
        setLoading(false);
      }
    };
    fetchSingleAlumni();
  }, [id]);

  return { alumni, loading, error };
}
