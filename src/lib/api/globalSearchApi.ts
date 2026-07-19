import { supabase } from '../supabase';
import { sanitizeIlikeTerm } from '../sanitize';
import { searchUsers } from './connectionsApi';
import { SocialProfile } from '../../types/social';

export interface MaterialSearchResult {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  folder_id: string | null;
}

export interface NoticeSearchResult {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

export interface GlobalSearchResults {
  materials: MaterialSearchResult[];
  notices: NoticeSearchResult[];
  people: SocialProfile[];
}

const EMPTY: GlobalSearchResults = { materials: [], notices: [], people: [] };

/** Searches study materials, active notices, and public profiles in parallel. */
export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return EMPTY;
  const term = sanitizeIlikeTerm(trimmed);

  const [materialsRes, noticesRes, people] = await Promise.all([
    supabase
      .from('study_materials')
      .select('id,title,description,file_url,folder_id')
      .ilike('title', `%${term}%`)
      .limit(5),
    supabase
      .from('notices')
      .select('id,title,category,created_at')
      .eq('is_active', true)
      .ilike('title', `%${term}%`)
      .order('created_at', { ascending: false })
      .limit(5),
    searchUsers({ query: trimmed }, 5),
  ]);

  return {
    materials: (materialsRes.data as MaterialSearchResult[]) ?? [],
    notices: (noticesRes.data as NoticeSearchResult[]) ?? [],
    people,
  };
}
