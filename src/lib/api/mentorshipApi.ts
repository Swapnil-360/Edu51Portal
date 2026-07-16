// Mentorship API — alumni/student mentorship connection helpers, plus
// "Suggested Mentors" discovery for the Alumni Directory.
import { supabase } from "../supabase";
import { AlumniProfile } from "../../types/social";

export interface MentorshipStatus {
  isConnected: boolean;
  hasPendingRequest: boolean;
}

/** Connection/request state between a student and an alumnus (for the public profile page). */
export async function checkMentorshipStatus(
  studentId: string,
  alumniId: string,
): Promise<MentorshipStatus> {
  const { data: connection } = await supabase
    .from("mentor_connections")
    .select("id")
    .eq("student_id", studentId)
    .eq("alumni_id", alumniId)
    .maybeSingle();

  if (connection) return { isConnected: true, hasPendingRequest: false };

  const { data: pending } = await supabase
    .from("mentorship_requests")
    .select("id")
    .eq("student_id", studentId)
    .eq("alumni_id", alumniId)
    .eq("status", "pending")
    .maybeSingle();

  return { isConnected: false, hasPendingRequest: !!pending };
}

/** Resolve the mentor_connections.id for a (student, alumni) pair, or null if not connected. */
export async function resolveConnectionId(
  studentId: string,
  alumniId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("mentor_connections")
    .select("id")
    .eq("student_id", studentId)
    .eq("alumni_id", alumniId)
    .maybeSingle();
  return data?.id ?? null;
}

const ALUMNI_SELECT_COLS =
  "id, full_name, email, avatar_url, graduation_year, major, job_title, company_name, city, linkedin_url, bio, career_tips, is_verified, is_available_for_mentorship, created_at, updated_at, skills, achievements, portfolio_url, social_links, contact_mode";

/**
 * Suggest mentors for a student based on major match + skills/interests overlap,
 * excluding alumni the student is already connected to or has a pending request with.
 */
export async function getSuggestedMentors(
  studentId: string,
  limit = 10,
): Promise<AlumniProfile[]> {
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("major, skills, interests")
    .eq("id", studentId)
    .maybeSingle();

  const studentMajor: string | null = studentProfile?.major ?? null;
  const studentSkills: string[] = studentProfile?.skills ?? [];
  const studentInterests: string[] = studentProfile?.interests ?? [];

  const [{ data: connections }, { data: pendingRequests }] = await Promise.all([
    supabase.from("mentor_connections").select("alumni_id").eq("student_id", studentId),
    supabase
      .from("mentorship_requests")
      .select("alumni_id")
      .eq("student_id", studentId)
      .eq("status", "pending"),
  ]);

  const excludedIds = new Set<string>([
    ...(connections ?? []).map((c) => c.alumni_id),
    ...(pendingRequests ?? []).map((r) => r.alumni_id),
  ]);

  let query = supabase
    .from("alumni_profiles")
    .select(ALUMNI_SELECT_COLS)
    .eq("is_verified", true)
    .eq("is_available_for_mentorship", true);

  if (excludedIds.size > 0) {
    query = query.not("id", "in", `(${[...excludedIds].join(",")})`);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates) return [];

  const score = (alumnus: AlumniProfile): number => {
    let s = 0;
    if (studentMajor && alumnus.major === studentMajor) s += 3;
    const alumniSkillsLower = (alumnus.skills ?? []).map((x) => x.toLowerCase());
    const skillOverlap = studentSkills.filter((sk) => alumniSkillsLower.includes(sk.toLowerCase())).length;
    s += Math.min(skillOverlap, 3);
    const interestOverlap = studentInterests.filter((it) => alumniSkillsLower.includes(it.toLowerCase())).length;
    s += Math.min(interestOverlap, 2);
    return s;
  };

  return (candidates as AlumniProfile[])
    .map((a) => ({ alumnus: a, score: score(a) }))
    .sort((a, b) => b.score - a.score || b.alumnus.graduation_year - a.alumnus.graduation_year)
    .slice(0, limit)
    .map((x) => x.alumnus);
}
