import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DAILY_LIMIT = 20;
const MAX_HISTORY_TURNS = 10;

const SYSTEM_PROMPT = `You are the Edu51 Assistant — a calm, knowledgeable helper for BUBT students across all departments (CSE, EEE, Textile, Civil, Data Science, BBA, English, Economics, LL.B.), not just one section or intake.

Platform you support:
- Study Materials: Google Drive-backed course files, organized by department → semester → course. Each course has Mid-term and Final exam folders. Only departments an admin has activated are live yet — others show "Coming Soon".
- Notices: academic announcements by category (general, exam, emergency, important link, other), targeted by department. Students can mute individual categories in their notification settings, except emergency alerts, which always come through.
- Teams: create or join a team for a project, use team chat, a shared task board, and shared team files.
- Network: connect with classmates.
- Alumni Hub: browse alumni profiles and connect with them for mentorship and career guidance.
- Resources: public files shared across all teams.
- Routine: a personal class schedule builder.
- Search (Ctrl/Cmd+K): searches materials, notices, and people at once.

How to respond:
- Be direct and clear. Answer in 1–3 sentences for simple questions; use a short numbered list only when steps are genuinely needed.
- Sound human — warm but not overly enthusiastic. No excessive greetings or filler phrases.
- For coursework questions: explain the concept and guide understanding. Don't write full answers, essays, or code solutions for assignments.
- If a question is about Study Materials, point there first.
- If a student's own department isn't active yet, say so plainly rather than guessing at content that doesn't exist.
- If you don't know something specific about the platform, say so honestly and suggest where to look.
- Never use more words than needed.`;

type ChatTurn = { role: "user" | "model"; text: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ error: "GEMINI_API_KEY secret not set" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller's JWT against their own session (anon client + their token)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Invalid or expired session" }, 401);
  const userId = userData.user.id;

  let body: { message?: string; history?: ChatTurn[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const message = body.message?.trim();
  if (!message) return json({ error: "message is required" }, 400);
  const history = (body.history ?? []).slice(-MAX_HISTORY_TURNS);

  // Service-role client for rate-limit bookkeeping (bypasses RLS by design)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await admin
    .from("ai_chat_usage")
    .select("id, message_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (usageRow && usageRow.message_count >= DAILY_LIMIT) {
    return json({ error: "daily_limit", limit: DAILY_LIMIT, remaining: 0 }, 429);
  }

  const newCount = (usageRow?.message_count ?? 0) + 1;
  if (usageRow) {
    await admin
      .from("ai_chat_usage")
      .update({ message_count: newCount })
      .eq("id", usageRow.id);
  } else {
    await admin
      .from("ai_chat_usage")
      .insert({ user_id: userId, usage_date: today, message_count: newCount });
  }
  const remaining = Math.max(0, DAILY_LIMIT - newCount);

  try {
    const contents = [
      ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return json({ error: `Gemini API error ${res.status}` }, 502);
    }

    const data = await res.json();
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return json({ error: "Empty response from Gemini" }, 502);

    return json({ reply, remaining, limit: DAILY_LIMIT });
  } catch (err) {
    console.error("ai-chat error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
