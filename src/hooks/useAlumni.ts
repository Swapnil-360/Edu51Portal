import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { sanitizeIlikeTerm } from '../lib/sanitize';
import { AlumniProfile } from '../types/social';

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
        setAlumni([]);
        return;
      }

      // Query real verified alumni from Supabase database
      let query = supabase
        .from('alumni_profiles')
        .select(
          'id, full_name, email, avatar_url, graduation_year, major, job_title, company_name, city, linkedin_url, bio, career_tips, is_verified, is_available_for_mentorship, created_at, updated_at, skills, achievements, portfolio_url, social_links, contact_mode'
        )
        .eq('is_verified', true);

      if (filters) {
        if (filters.major && filters.major !== 'All') {
          if (filters.major === 'Other') {
            query = query.not(
              'major',
              'in',
              '("CSE","EEE","BBA","Textile","Civil","English","Law","Economics","Mathematics")'
            );
          } else {
            query = query.ilike('major', filters.major);
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

      query = query
        .not(
          'full_name',
          'in',
          '("Nusrat Jahan","Raisa Sultana","Rezaul Karim","Sabbir Hossain","Sadia Islam","Arif Hasan")'
        )
        .order('created_at', { ascending: false });

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const cleanData = (data || []).filter(
        (a) =>
          !['Nusrat Jahan', 'Raisa Sultana', 'Rezaul Karim', 'Sabbir Hossain', 'Sadia Islam', 'Arif Hasan'].some(
            (name) => name.toLowerCase() === a.full_name?.trim().toLowerCase()
          )
      );
      setAlumni(cleanData);
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
          setAlumni(null);
          return;
        }

        const { data, error: fetchErr } = await supabase
          .from('alumni_profiles')
          .select(
            'id, full_name, email, avatar_url, graduation_year, major, job_title, company_name, city, linkedin_url, bio, career_tips, is_verified, is_available_for_mentorship, created_at, updated_at, skills, achievements, portfolio_url, social_links, contact_mode'
          )
          .eq('id', id)
          .single();

        if (fetchErr) throw fetchErr;
        setAlumni(data);
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
