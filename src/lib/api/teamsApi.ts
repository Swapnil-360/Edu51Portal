// Teams API — team CRUD, discovery, membership, invitations, join requests, announcements.
import { supabase } from "../supabase";
import {
  Team,
  TeamMember,
  TeamInvitation,
  TeamJoinRequest,
  TeamAnnouncement,
  TeamCategory,
  PROFILE_CARD_COLS,
  TeamTask,
  TaskPriority,
} from "../../types/social";
import { normalizeProfile } from "./profileApi";
import { sanitizeIlikeTerm } from "../sanitize";

export interface CreateTeamPayload {
  name: string;
  description?: string;
  goal?: string;
  category: TeamCategory;
  required_skills: string[];
  max_members: number;
  owner_id: string;
}

export async function createTeam(
  payload: CreateTeamPayload,
): Promise<{ team: Team | null; error: string | null }> {
  payload.required_skills = payload.required_skills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const { data, error } = await supabase
    .from("teams")
    .insert([payload])
    .select()
    .single();
  if (error) return { team: null, error: error.message };
  return { team: data as Team, error: null };
}

export async function updateTeam(
  teamId: string,
  payload: Partial<CreateTeamPayload> & { logo_url?: string; banner_url?: string },
): Promise<{ error: string | null }> {
  if (payload.required_skills) {
    payload.required_skills = payload.required_skills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  const { error } = await supabase
    .from("teams")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", teamId);
  return { error: error?.message ?? null };
}

export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  return { error: error?.message ?? null };
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).single();
  return error ? null : (data as Team);
}

export interface TeamSearchFilters {
  query?: string;
  category?: TeamCategory | "";
  skills?: string[];
}

export async function discoverTeams(
  filters: TeamSearchFilters,
  limit = 30,
): Promise<Team[]> {
  let q = supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(limit);
  if (filters.query?.trim()) {
    const term = sanitizeIlikeTerm(filters.query.trim());
    q = q.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.skills?.length) {
    q = q.overlaps("required_skills", filters.skills.map((s) => s.toLowerCase()));
  }
  const { data, error } = await q;
  if (error || !data) return [];
  return attachMemberCounts(data as Team[]);
}

export async function listMyTeams(userId: string): Promise<Team[]> {
  const { data: memberships, error } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId);
  if (error || !memberships?.length) return [];

  const roleByTeam = new Map(memberships.map((m: any) => [m.team_id, m.role]));
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .in("id", [...roleByTeam.keys()]);
  if (!teams) return [];
  const withRole = (teams as Team[]).map((t) => ({ ...t, my_role: roleByTeam.get(t.id) ?? null }));
  return attachMemberCounts(withRole);
}

async function attachMemberCounts(teams: Team[]): Promise<Team[]> {
  if (!teams.length) return teams;
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .in("team_id", teams.map((t) => t.id));
  const counts = new Map<string, number>();
  ((data as any[]) ?? []).forEach((r) => counts.set(r.team_id, (counts.get(r.team_id) ?? 0) + 1));
  return teams.map((t) => ({ ...t, member_count: counts.get(t.id) ?? 0 }));
}

// ── Members ─────────────────────────────────────────────────────────────────

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  // Single query — join profiles inline to avoid a second round-trip
  const { data, error } = await supabase
    .from("team_members")
    .select(`*, profiles!user_id(${PROFILE_CARD_COLS},profile_pic)`)
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    ...row,
    profile: row.profiles ? normalizeProfile(row.profiles) : undefined,
    profiles: undefined,
  }));
}

export async function removeMember(teamId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);
  return { error: error?.message ?? null };
}

export async function setMemberRole(
  teamId: string,
  userId: string,
  role: "admin" | "member",
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("user_id", userId);
  return { error: error?.message ?? null };
}

// ── Invitations ─────────────────────────────────────────────────────────────

export async function inviteUser(
  teamId: string,
  inviterId: string,
  inviteeId: string,
  message?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("team_invitations").insert([
    { team_id: teamId, inviter_id: inviterId, invitee_id: inviteeId, message: message ?? null },
  ]);
  if (error) {
    if (error.message?.includes("team_inv_pending_uq")) {
      return { error: "This user already has a pending invitation." };
    }
    return { error: error.message };
  }
  return { error: null };
}

/** Invitations I received (pending). */
export async function listMyInvitations(userId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return attachInvitationContext(data as TeamInvitation[]);
}

/** Pending invitations sent for a team (owner/admin view). */
export async function listTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return attachInvitationContext(data as TeamInvitation[]);
}

async function attachInvitationContext(invs: TeamInvitation[]): Promise<TeamInvitation[]> {
  if (!invs.length) return invs;
  const teamIds = [...new Set(invs.map((i) => i.team_id))];
  const userIds = [...new Set(invs.flatMap((i) => [i.inviter_id, i.invitee_id]))];
  const [{ data: teams }, { data: profiles }] = await Promise.all([
    supabase.from("teams").select("*").in("id", teamIds),
    supabase.from("profiles").select(PROFILE_CARD_COLS).in("id", userIds),
  ]);
  const teamById = new Map(((teams as any[]) ?? []).map((t) => [t.id, t as Team]));
  const profById = new Map(((profiles as any[]) ?? []).map((p) => [p.id, normalizeProfile(p)]));
  return invs.map((i) => ({
    ...i,
    team: teamById.get(i.team_id),
    inviter_profile: profById.get(i.inviter_id),
    invitee_profile: profById.get(i.invitee_id),
  }));
}

export async function respondToInvitation(
  invitationId: string,
  accept: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("respond_team_invitation", {
    _invitation: invitationId,
    _accept: accept,
  });
  return { error: error?.message ?? null };
}

export async function cancelInvitation(invitationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("team_invitations")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", invitationId);
  return { error: error?.message ?? null };
}

// ── Join requests ───────────────────────────────────────────────────────────

export async function requestToJoin(
  teamId: string,
  userId: string,
  message?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("team_join_requests").insert([
    { team_id: teamId, user_id: userId, message: message ?? null },
  ]);
  if (error) {
    if (error.message?.includes("team_jr_pending_uq")) {
      return { error: "You already have a pending request for this team." };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function listTeamJoinRequests(teamId: string): Promise<TeamJoinRequest[]> {
  const { data, error } = await supabase
    .from("team_join_requests")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const reqs = data as TeamJoinRequest[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_CARD_COLS)
    .in("id", reqs.map((r) => r.user_id));
  const byId = new Map(((profiles as any[]) ?? []).map((p) => [p.id, normalizeProfile(p)]));
  return reqs.map((r) => ({ ...r, user_profile: byId.get(r.user_id) }));
}

/** My pending join requests (to show "Requested" state on team cards). */
export async function listMyJoinRequests(userId: string): Promise<TeamJoinRequest[]> {
  const { data, error } = await supabase
    .from("team_join_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending");
  return error ? [] : (data as TeamJoinRequest[]);
}

export async function respondToJoinRequest(
  requestId: string,
  approve: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("respond_join_request", {
    _request: requestId,
    _approve: approve,
  });
  return { error: error?.message ?? null };
}

export async function cancelJoinRequest(requestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("team_join_requests")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", requestId);
  return { error: error?.message ?? null };
}

// ── Announcements ───────────────────────────────────────────────────────────

export async function listAnnouncements(teamId: string): Promise<TeamAnnouncement[]> {
  const { data, error } = await supabase
    .from("team_announcements")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const anns = data as TeamAnnouncement[];
  if (!anns.length) return anns;
  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_CARD_COLS)
    .in("id", [...new Set(anns.map((a) => a.author_id))]);
  const byId = new Map(((profiles as any[]) ?? []).map((p) => [p.id, normalizeProfile(p)]));
  return anns.map((a) => ({ ...a, author_profile: byId.get(a.author_id) }));
}

export async function postAnnouncement(
  teamId: string,
  authorId: string,
  title: string,
  body?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("team_announcements").insert([
    { team_id: teamId, author_id: authorId, title, body: body ?? null },
  ]);

  if (!error) {
    notifyTeamAnnouncement(teamId, authorId, title).catch((err) => {
      console.warn("Announcement notification error:", err);
    });
  }

  return { error: error?.message ?? null };
}

export async function deleteAnnouncement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("team_announcements").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ── Tasks / Kanban Board ───────────────────────────────────────────────────

export async function listTeamTasks(teamId: string): Promise<TeamTask[]> {
  const { data, error } = await supabase
    .from("team_tasks")
    .select(`
      *,
      assigned_profile:profiles!assigned_to (
        id, username, name, headline, avatar_url, profile_pic
      ),
      creator_profile:profiles!created_by (
        id, username, name, headline, avatar_url, profile_pic
      )
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  
  if (error || !data) return [];
  
  // Normalize the profile structures using normalizeProfile if necessary
  const rawTasks = data as any[];
  return rawTasks.map(t => ({
    ...t,
    assigned_profile: t.assigned_profile ? normalizeProfile(t.assigned_profile) : null,
    creator_profile: t.creator_profile ? normalizeProfile(t.creator_profile) : null,
  })) as unknown as TeamTask[];
}

export async function notifyTaskAssignment(
  assigneeUserId: string,
  taskTitle: string,
  teamId: string,
  assignerName: string,
): Promise<void> {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        title: "You've been assigned a task",
        body: `${assignerName} assigned "${taskTitle}" to you`,
        url: `/teams/${teamId}`,
        targetUserId: assigneeUserId,
      },
    });
  } catch {
    // Non-fatal — notification failure should never block task creation/update
  }
}

export async function createTeamTask(payload: {
  team_id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority?: TaskPriority;
  assigned_to?: string | null;
  created_by: string;
  due_date?: string | null;
}): Promise<{ task: TeamTask | null; error: string | null }> {
  const { data, error } = await supabase
    .from("team_tasks")
    .insert([payload])
    .select()
    .single();
  if (error) return { task: null, error: error.message };
  return { task: data as TeamTask, error: null };
}

export async function updateTeamTask(
  taskId: string,
  payload: Partial<Omit<TeamTask, "id" | "team_id" | "created_at" | "created_by">>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("team_tasks")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  return { error: error?.message ?? null };
}

export async function deleteTeamTask(taskId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("team_tasks").delete().eq("id", taskId);
  return { error: error?.message ?? null };
}

export async function notifyTeamAnnouncement(
  teamId: string,
  authorId: string,
  annTitle: string,
): Promise<void> {
  try {
    // 1. Fetch team details
    const { data: teamData } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single();
    
    if (!teamData) return;
    const teamName = teamData.name;

    // 2. Fetch author profile details
    const { data: authorData } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", authorId)
      .single();
    
    const authorName = authorData?.name || "Team Admin";

    // 3. Fetch team members
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId);
    
    if (!members || !members.length) return;

    // 4. Filter out the author of the announcement
    const recipientIds = members
      .map((m: any) => m.user_id)
      .filter((id) => id !== authorId);
    
    if (recipientIds.length === 0) return;

    // 5. Insert in-app notifications
    const notificationRows = recipientIds.map((userId) => ({
      user_id: userId,
      type: "notice",
      title: `There is an announcement from ${teamName}`,
      body: annTitle,
      team_id: teamId,
      actor_id: authorId,
      actor_name: authorName,
      read: false,
    }));

    await supabase.from("notifications").insert(notificationRows);

    // 6. Send push notifications via Supabase Edge Function
    await Promise.all(
      recipientIds.map((userId) =>
        supabase.functions
          .invoke("send-push-notification", {
            body: {
              title: `Announcement from ${teamName}`,
              body: `There is an announcement from ${teamName}`,
              url: `/teams/${teamId}`,
              targetUserId: userId,
            },
          })
          .catch(() => {})
      )
    );
  } catch (err) {
    console.warn("Failed to notify team members about announcement:", err);
  }
}

