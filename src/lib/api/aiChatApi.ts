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

export async function sendChatMessage(
  message: string,
  history: ChatTurn[],
  systemPrompt?: string
): Promise<ChatReply> {
  const defaultPrompt = `You are EVA (full name: EVA51 / Edu Virtual Assistant 51) — an intelligent, friendly, and highly knowledgeable academic copilot for BUBT (Bangladesh University of Business and Technology) students across all departments (CSE, EEE, Textile, Civil, Data Science, BBA, English, Economics, Law/LL.B., Mathematics). Students may address you as "EVA", "EVA51", or say "Hey EVA". Never refer to yourself as "Edu51 Assistant" or "edu51 assistant"; always introduce yourself as EVA or EVA51 (Edu Virtual Assistant 51).`;

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      message,
      history,
      systemPrompt: systemPrompt || defaultPrompt,
    },
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
