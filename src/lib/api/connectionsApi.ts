// Connections API — LinkedIn-style request/accept network + user discovery.
import { supabase } from "../supabase";
import {
  Connection,
  SocialProfile,
  PROFILE_CARD_COLS,
} from "../../types/social";
import { normalizeProfile } from "./profileApi";
import { sanitizeIlikeTerm } from "../sanitize";

export async function sendConnectionRequest(
  requesterId: string,
  addresseeId: string,
): Promise<{ error: string | null }> {
  // Check if a connection row already exists (in any status)
  const { data: existing, error: fetchError } = await supabase
    .from("connections")
    .select("id, status")
    .or(`and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (existing) {
    if (existing.status === "rejected") {
      // Delete the rejected row so we can create a new pending one.
      // This is needed to comply with the unique index connections_pair_uq and RLS delete policy.
      const { error: deleteError } = await supabase
        .from("connections")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return { error: deleteError.message };
      }
    } else {
      return { error: "A connection or pending request already exists." };
    }
  }

  const { error } = await supabase
    .from("connections")
    .insert([{ requester_id: requesterId, addressee_id: addresseeId }]);
  if (error) {
    if (error.message?.includes("connections_pair_uq")) {
      return { error: "A connection or pending request already exists." };
    }
    return { error: error.message };
  }

  try {
    // Fetch sender profile name to construct the notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", requesterId)
      .single();
    const name = profile?.name || "Someone";

    // Insert notification row for the addressee
    await supabase.from("notifications").insert([{
      user_id: addresseeId,
      type: "notice",
      title: "Connection Request",
      body: `${name} sent you a connection request.`,
      actor_id: requesterId,
      actor_name: name,
      read: false,
    }]);
  } catch (err) {
    console.error("Failed to insert connection request notification:", err);
  }

  return { error: null };
}

export async function respondToRequest(
  connectionId: string,
  accept: boolean,
): Promise<{ error: string | null }> {
  if (!accept) {
    const { error } = await supabase
      .from("connections")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
      })
      .eq("id", connectionId);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase
    .from("connections")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", connectionId);
  return { error: error?.message ?? null };
}

/** Cancel an outgoing pending request, or remove an accepted connection. */
export async function removeConnection(
  connectionId: string,
  isMentorship?: boolean,
): Promise<{ error: string | null }> {
  if (isMentorship) {
    const { error } = await supabase.from("mentor_connections").delete().eq("id", connectionId);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("connections").delete().eq("id", connectionId);
  return { error: error?.message ?? null };
}

/** All connection rows involving me (any status), with the other user's profile joined. */
export async function listMyConnections(myId: string): Promise<Connection[]> {
  const [
    { data: peerData, error: peerErr },
    { data: mentorStudentData, error: mentorStudentErr },
    { data: mentorAlumniData, error: mentorAlumniErr }
  ] = await Promise.all([
    supabase
      .from("connections")
      .select("*")
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("mentor_connections")
      .select("*")
      .eq("student_id", myId),
    supabase
      .from("mentor_connections")
      .select("*")
      .eq("alumni_id", myId),
  ]);

  if (peerErr) {
    console.error("[DEBUG] Error fetching peer connections:", peerErr.message, peerErr);
  }
  if (mentorStudentErr) {
    console.error("[DEBUG] Error fetching mentor student connections:", mentorStudentErr.message, mentorStudentErr);
  }
  if (mentorAlumniErr) {
    console.error("[DEBUG] Error fetching mentor alumni connections:", mentorAlumniErr.message, mentorAlumniErr);
  }

  const mentorData = [
    ...(mentorStudentData ?? []),
    ...(mentorAlumniData ?? [])
  ];

  console.log("mentor_connections raw:", mentorData);

  if ((peerErr && mentorStudentErr && mentorAlumniErr) || (!peerData && mentorData.length === 0)) return [];

  const peerRows = (peerData as Connection[] ?? []).map((row) => ({
    ...row,
    is_mentorship: false,
  }));

  const mentorRows = (mentorData as any[] ?? []).map((row) => ({
    id: row.id,
    requester_id: row.student_id,
    addressee_id: row.alumni_id,
    status: "accepted" as Connection["status"],
    created_at: row.created_at || new Date().toISOString(),
    responded_at: row.created_at || new Date().toISOString(),
    is_mentorship: true,
  }));

  const mergedRows = [...peerRows, ...mentorRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const otherIds = [
    ...new Set(
      mergedRows.map((c) => (c.requester_id === myId ? c.addressee_id : c.requester_id)),
    ),
  ];
  if (otherIds.length === 0) return mergedRows;

  // Query both profiles and alumni_profiles in parallel to support both student and alumni roles
  const [profilesRes, alumniRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(`${PROFILE_CARD_COLS},profile_pic`)
      .in("id", otherIds),
    supabase
      .from("alumni_profiles")
      .select("id, full_name, avatar_url, job_title, company_name, graduation_year, major, skills")
      .in("id", otherIds),
  ]);

  if (profilesRes.error) {
    console.error("[DEBUG] Error fetching profiles:", profilesRes.error.message, profilesRes.error);
  }
  if (alumniRes.error) {
    console.error("[DEBUG] Error fetching alumni profiles:", alumniRes.error.message, alumniRes.error);
  }

  const byId = new Map<string, SocialProfile>();

  if (profilesRes.data) {
    for (const p of profilesRes.data) {
      byId.set(p.id, normalizeProfile(p));
    }
  }

  if (alumniRes.data) {
    for (const ap of alumniRes.data) {
      const headline = ap.job_title && ap.company_name
        ? `${ap.job_title} at ${ap.company_name}`
        : ap.job_title || ap.company_name || `Alumni (Class of ${ap.graduation_year})`;

      const mappedProfile: SocialProfile = {
        id: ap.id,
        username: null,
        name: ap.full_name,
        headline: headline,
        about: null,
        location: null,
        website: null,
        social_links: {},
        avatar_url: ap.avatar_url,
        cover_photo_url: null,
        skills: ap.skills ?? [],
        interests: [],
        visibility: "users",
        is_alumni: true,
        is_admin: false,
        section: `Alumni (Class of ${ap.graduation_year})`,
        major: ap.major,
        department: null,
        bubt_email: null,
        phone: null,
        profile_pic: null,
        created_at: new Date().toISOString(),
        role: "alumni",
      };

      const existing = byId.get(ap.id);
      if (existing) {
        byId.set(ap.id, {
          ...existing,
          ...mappedProfile,
          username: existing.username,
          bubt_email: existing.bubt_email || mappedProfile.bubt_email,
          phone: existing.phone || mappedProfile.phone,
        });
      } else {
        byId.set(ap.id, mappedProfile);
      }
    }
  }

  const result = mergedRows.map((c) => ({
    ...c,
    other_profile: byId.get(c.requester_id === myId ? c.addressee_id : c.requester_id),
  }));
  console.log("joined connections:", result);
  return result;
}

export interface UserSearchFilters {
  query?: string;       // matches name or username
  skills?: string[];    // overlap match
  interests?: string[]; // overlap match
  section?: string;
  major?: string;
  excludeIds?: string[];
}

/** Discover users. Excludes private profiles. */
export async function searchUsers(
  filters: UserSearchFilters,
  limit = 30,
): Promise<SocialProfile[]> {
  let q = supabase
    .from("profiles")
    .select(PROFILE_CARD_COLS)
    .neq("visibility", "private")
    .limit(limit);

  if (filters.query?.trim()) {
    const term = sanitizeIlikeTerm(filters.query.trim());
    q = q.or(`name.ilike.%${term}%,username.ilike.%${term}%,headline.ilike.%${term}%`);
  }
  if (filters.skills?.length) {
    q = q.overlaps("skills", filters.skills.map((s) => s.toLowerCase()));
  }
  if (filters.interests?.length) {
    q = q.overlaps("interests", filters.interests.map((s) => s.toLowerCase()));
  }
  if (filters.section) q = q.ilike("section", `%${filters.section}%`);
  if (filters.major) q = q.ilike("major", `%${filters.major}%`);

  const { data, error } = await q;
  if (error || !data) return [];
  let results = (data as any[]).map(normalizeProfile);
  if (filters.excludeIds?.length) {
    const excl = new Set(filters.excludeIds);
    results = results.filter((p) => !excl.has(p.id));
  }
  return results;
}
