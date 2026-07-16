// Admin API — user moderation actions (ban/unban, permanent delete).
import { supabase } from "../supabase";

export async function banUser(targetId: string, reason?: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_set_user_banned", {
    target: targetId,
    banned: true,
    reason: reason ?? null,
  });
  return { error: error?.message ?? null };
}

export async function unbanUser(targetId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_set_user_banned", {
    target: targetId,
    banned: false,
    reason: null,
  });
  return { error: error?.message ?? null };
}

export interface DeleteUserResult {
  success: boolean;
  error?: string;
  teamsTransferred?: { teamId: string; newOwnerId: string }[];
}

export async function deleteUserAccount(targetId: string): Promise<DeleteUserResult> {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { targetId },
  });
  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true, teamsTransferred: data?.teamsTransferred ?? [] };
}
