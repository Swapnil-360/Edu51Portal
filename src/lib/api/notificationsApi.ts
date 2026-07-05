import { supabase } from "../supabase";

export interface AppNotification {
  id: string;
  user_id: string;
  type: "mention" | "notice" | "alumni_approval";
  title: string;
  body: string | null;
  team_id: string | null;
  message_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  read: boolean;
  created_at: string;
}

export async function getUnreadNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function createMentionNotification(params: {
  userId: string;
  actorId: string;
  actorName: string;
  teamId: string;
  teamName: string;
  messageId: string;
  preview: string;
}): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: "mention",
    title: `${params.actorName} mentioned you in ${params.teamName}`,
    body: params.preview,
    team_id: params.teamId,
    message_id: params.messageId,
    actor_id: params.actorId,
    actor_name: params.actorName,
  });
}
