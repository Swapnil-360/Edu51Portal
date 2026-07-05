// Connections API — LinkedIn-style request/accept network + user discovery.
import { supabase } from "../supabase";
import {
  Connection,
  SocialProfile,
  PROFILE_CARD_COLS,
} from "../../types/social";
import { normalizeProfile } from "./profileApi";

export async function sendConnectionRequest(
  requesterId: string,
  addresseeId: string,
): Promise<{ error: string | null }> {
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
    const { error } = await supabase.from("connections").delete().eq("id", connectionId);
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
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("connections").delete().eq("id", connectionId);
  return { error: error?.message ?? null };
}

/** All connection rows involving me (any status), with the other user's profile joined. */
export async function listMyConnections(myId: string): Promise<Connection[]> {
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const rows = data as Connection[];
  const otherIds = [
    ...new Set(
      rows.map((c) => (c.requester_id === myId ? c.addressee_id : c.requester_id)),
    ),
  ];
  if (otherIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select(`${PROFILE_CARD_COLS},profile_pic`)
    .in("id", otherIds);
  const byId = new Map(
    ((profiles as any[]) ?? []).map((p) => [p.id, normalizeProfile(p)]),
  );
  return rows.map((c) => ({
    ...c,
    other_profile: byId.get(c.requester_id === myId ? c.addressee_id : c.requester_id),
  }));
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
    const term = filters.query.trim().replace(/[%,()]/g, "");
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
