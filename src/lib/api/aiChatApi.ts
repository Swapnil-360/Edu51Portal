import { supabase } from "../supabase";

export type ChatTurn = { role: "user" | "model"; text: string };

export interface ChatReply {
  reply: string;
  remaining: number;
  limit: number;
}

export const AI_CHAT_DAILY_LIMIT = 20;

export async function getRemainingMessagesToday(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ai_chat_usage")
    .select("message_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();
  const used = data?.message_count ?? 0;
  return Math.max(0, AI_CHAT_DAILY_LIMIT - used);
}

export async function sendChatMessage(message: string, history: ChatTurn[]): Promise<ChatReply> {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: { message, history },
  });

  if (error) {
    // supabase-js surfaces non-2xx edge function responses as FunctionsHttpError;
    // the actual {error: "..."} body is on error.context
    const context = (error as { context?: Response }).context;
    if (context?.status === 429) throw new Error("daily_limit");
    throw error;
  }

  return data as ChatReply;
}
