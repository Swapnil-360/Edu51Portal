// Profile API — LinkedIn-style profile CRUD on top of the existing profiles table.
import { supabase } from "../supabase";
import {
  SocialProfile,
  Education,
  Experience,
  SOCIAL_PROFILE_COLS,
} from "../../types/social";

export async function getProfileById(id: string): Promise<SocialProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SOCIAL_PROFILE_COLS)
    .eq("id", id)
    .single();
  if (error) return null;
  return normalizeProfile(data);
}

export async function getProfileByUsername(
  username: string,
): Promise<SocialProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SOCIAL_PROFILE_COLS)
    .ilike("username", username)
    .single();
  if (error) return null;
  return normalizeProfile(data);
}

/** Legacy base64 avatar fallback — fetched separately so lists stay fast. */
export async function getLegacyProfilePic(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_pic")
    .eq("id", userId)
    .single();
  if (error || !data?.profile_pic) return null;
  return data.profile_pic;
}

export interface ProfileUpdatePayload {
  name?: string;
  username?: string;
  headline?: string | null;
  about?: string | null;
  location?: string | null;
  website?: string | null;
  social_links?: Record<string, string>;
  avatar_url?: string | null;
  cover_photo_url?: string | null;
  skills?: string[];
  interests?: string[];
  visibility?: string;
  section?: string;
  major?: string;
  phone?: string;
}

export async function updateProfile(
  userId: string,
  payload: ProfileUpdatePayload,
): Promise<{ error: string | null }> {
  // normalize skills/interests to lowercase for searchability
  if (payload.skills) payload.skills = dedupeLower(payload.skills);
  if (payload.interests) payload.interests = dedupeLower(payload.interests);
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) {
    if (error.message?.includes("profiles_username_lower_uq")) {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }
  return { error: null };
}

// ── Educations ──────────────────────────────────────────────────────────────

export async function listEducations(userId: string): Promise<Education[]> {
  const { data, error } = await supabase
    .from("educations")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("graduation_year", { ascending: false, nullsFirst: false });
  return error ? [] : (data as Education[]);
}

export async function upsertEducation(
  edu: Partial<Education> & { user_id: string; institution: string },
): Promise<{ error: string | null }> {
  const { id, ...rest } = edu;
  const { error } = id
    ? await supabase.from("educations").update(edu).eq("id", id)
    : await supabase.from("educations").insert([rest]);
  return { error: error?.message ?? null };
}

export async function deleteEducation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("educations").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ── Experiences ─────────────────────────────────────────────────────────────

export async function listExperiences(userId: string): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", userId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });
  return error ? [] : (data as Experience[]);
}

export async function upsertExperience(
  exp: Partial<Experience> & { user_id: string; title: string; company: string; start_date: string },
): Promise<{ error: string | null }> {
  const { id, ...rest } = exp;
  const { error } = id
    ? await supabase.from("experiences").update(exp).eq("id", id)
    : await supabase.from("experiences").insert([rest]);
  return { error: error?.message ?? null };
}

export async function deleteExperience(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("experiences").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function dedupeLower(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

export function normalizeProfile(row: any): SocialProfile {
  return {
    ...row,
    social_links: row.social_links ?? {},
    skills: row.skills ?? [],
    interests: row.interests ?? [],
    visibility: row.visibility ?? "users",
    is_alumni: row.is_alumni ?? false,
    is_admin: row.is_admin ?? false,
    profile_pic: row.profile_pic ?? null,
  } as SocialProfile;
}
