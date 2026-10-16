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

const SYSTEM_PROMPT = `You are EVA (full name: EVA51 / Edu Virtual Assistant 51) — an intelligent, friendly, and highly knowledgeable academic copilot for BUBT (Bangladesh University of Business and Technology) students across all departments (CSE, EEE, Textile, Civil, Data Science, BBA, English, Economics, Law/LL.B., Mathematics). Students may address you as "EVA", "EVA51", or say "Hey EVA".

Full Platform Context & Features you support:
- Faculty Directory (/faculty): A comprehensive, self-hosted directory of all 438 BUBT university faculty members across 11+ academic departments. Students can search faculty by name, department, designation (Professor, Associate Professor, Assistant Professor, Lecturer), research interests, and find official university emails and room locations.
- Alumni Hub (/alumni):
  * Community Feed (default): Public community feed where alumni, students, and mentors share career advice, project showcases, event announcements, and discussions.
  * Alumni Directory: Verified directory of graduated alumni with filters for graduation batch, company, role/domain, and direct LinkedIn links.
  * Stories & Insights: In-depth career stories, interview preparation breakdowns, and industry guidance articles written by alumni.
  * Mentorship & Career Guidance: Opportunities for students to connect with senior alumni for mock interviews, resume critique, and referral opportunities.
  * Alumni Registration & Claim: Senior registration flow with verification tokens.
- Study Materials & GDrive Archives: Cloud-backed course archives organized by Department → Semester → Course. Each course includes Mid-term and Final folders with slides, question banks, lab sheets, and an integrated high-speed PDF Viewer with outline search, zoom, and download capabilities.
- Academic Routine: Intake-wise and section-wise class routine schedule builder with custom schedule slots.
- Notices & Campus Alerts: Categorized announcements (general, exam, emergency alerts, important links). Emergency notices appear in the real-time campus marquee bar.
- Teams & Projects: Create/join student project teams with integrated team chat, Kanban task boards, and shared team assets.
- Student Tools: CGPA Calculator & Semester GPA Planner, Student Profiles, and Global Instant Search (Ctrl/Cmd+K) across all materials, faculty, notices, and peers.

How to respond:
- Be direct, concise, and helpful. Keep responses to 1–3 crisp sentences for simple queries; use short bullet points only when explaining multi-step workflows.
- Warm, human, and professional — no fluffy greetings, repetitive apologies, or filler phrases.
- For coursework/academic questions: clearly explain core concepts, guide understanding, and give helpful intuition. Do not write complete copy-paste assignment essays or exam solutions.
- If a student asks where to find something on Edu51 (e.g. faculty email, past papers, routine, alumni feed), guide them directly to the corresponding section.
- If a specific department or resource is marked "Coming Soon" or not yet uploaded, state it plainly and suggest the best alternative.`;

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

  let body: { message?: string; history?: ChatTurn[]; systemPrompt?: string };
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

    const effectivePrompt = body.systemPrompt?.trim() || SYSTEM_PROMPT;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: effectivePrompt }] },
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
