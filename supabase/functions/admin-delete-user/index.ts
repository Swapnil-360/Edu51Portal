// Edge Function: admin-delete-user
// Permanently deletes a user account: transfers away any team ownership first,
// cleans up personal-data tables that have no enforced FK to profiles/auth.users,
// deletes the profiles row (cascades team_members/connections/etc.), then removes
// the actual auth.users row via the Admin API so the account can never sign in
// again. Logs the action to admin_actions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// Always return HTTP 200 — supabase.functions.invoke() puts non-2xx responses
// into error.context (not data), making the body hard to read on the client.
// Failures are signaled via { error: "..." } in the JSON body instead.
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller's own session, then confirm they're an admin via RPC
  // (is_app_admin() reads auth.uid() from this client's JWT).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData?.user) return json({ error: "Invalid or expired session" });

  const { data: isAdmin, error: adminCheckErr } = await callerClient.rpc("is_app_admin");
  if (adminCheckErr || !isAdmin) return json({ error: "Not authorized" });

  let body: { targetId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" });
  }
  const targetId = body.targetId;
  if (!targetId) return json({ error: "targetId is required" });
  if (targetId === callerData.user.id) return json({ error: "You cannot delete your own account" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Refuse to delete the owner account
    const { data: targetProfile, error: targetErr } = await admin
      .from("profiles")
      .select("id, name, is_owner")
      .eq("id", targetId)
      .maybeSingle();
    if (targetErr || !targetProfile) return json({ error: "User not found" });
    if (targetProfile.is_owner) return json({ error: "Cannot delete the owner account" });

    // Transfer away any team ownership before deleting, so other members keep their team
    const teamsTransferred: { teamId: string; newOwnerId: string }[] = [];
    const { data: ownedTeams } = await admin
      .from("team_members")
      .select("team_id")
      .eq("user_id", targetId)
      .eq("role", "owner");

    for (const { team_id } of ownedTeams ?? []) {
      const { data: candidates } = await admin
        .from("team_members")
        .select("user_id, role, joined_at")
        .eq("team_id", team_id)
        .neq("user_id", targetId)
        .order("joined_at", { ascending: true });

      const replacement =
        candidates?.find((c) => c.role === "admin") ?? candidates?.[0] ?? null;

      if (replacement) {
        await admin.from("teams").update({ owner_id: replacement.user_id }).eq("id", team_id);
        await admin
          .from("team_members")
          .update({ role: "owner" })
          .eq("team_id", team_id)
          .eq("user_id", replacement.user_id);
        teamsTransferred.push({ teamId: team_id, newOwnerId: replacement.user_id });
      }
      // else: target is the sole member — the team cascade-deletes with their profile row below.
    }

    // Clean up personal-data tables with no enforced FK to profiles/auth.users
    await admin.from("notifications").delete().or(`user_id.eq.${targetId},actor_id.eq.${targetId}`);
    await admin.from("user_routines").delete().eq("user_id", targetId);
    await admin.from("ai_chat_usage").delete().eq("user_id", targetId);
    await admin.from("push_subscriptions").delete().eq("user_id", targetId);
    await admin.from("feedback").delete().eq("user_id", targetId);
    await admin.from("alumni_profiles").delete().eq("id", targetId);

    // Delete the profile row — cascades connections/educations/experiences/
    // team_members/team_files/team_announcements/team_invitations/team_join_requests/
    // team_tasks/owned-teams-with-no-remaining-members.
    const { error: deleteProfileErr } = await admin.from("profiles").delete().eq("id", targetId);
    if (deleteProfileErr) throw deleteProfileErr;

    // Remove the actual login account so it can never sign in again
    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(targetId);
    if (deleteAuthErr) throw deleteAuthErr;

    await admin.from("admin_actions").insert({
      admin_id: callerData.user.id,
      target_user_id: targetId,
      action: "delete",
      reason: teamsTransferred.length
        ? `Deleted "${targetProfile.name}". Transferred ownership of ${teamsTransferred.length} team(s).`
        : `Deleted "${targetProfile.name}".`,
    });

    return json({ success: true, teamsTransferred });
  } catch (e) {
    console.error("admin-delete-user error:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error." });
  }
});
