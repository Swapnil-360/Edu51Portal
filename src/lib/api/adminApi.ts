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

export interface AiUsageToday {
  totalMessages: number;
  activeUsers: number;
}

// Gemini free-tier project cap for gemini-2.5-flash is 250 requests/day —
// this lets admins see how close today's combined usage is to that ceiling.
export const GEMINI_FREE_TIER_DAILY_LIMIT = 250;

export async function getAiUsageToday(): Promise<AiUsageToday | null> {
  const { data, error } = await supabase.rpc("admin_get_ai_usage_today").single<{
    total_messages: number;
    active_users: number;
  }>();
  if (error || !data) return null;
  return { totalMessages: Number(data.total_messages), activeUsers: Number(data.active_users) };
}
