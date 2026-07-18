# Edu51Portal — What Everything Is and How It Works

**Who this is for:** anyone on the team — not just engineers. If someone asks "how does the ban feature work?" or "where do course files actually come from?", the answer should be in here, in plain words.

**How to read this:** each feature gets three questions answered — **What is it** (in normal words), **How it works for the user** (the click-by-click experience), and **How it works behind the scenes** (what actually happens in the database/servers). Technical file names are included in `code font` for engineers, but you don't need to understand them to get the gist.

For exact file/line locations, see [`PROJECT-STRUCTURE.md`](./PROJECT-STRUCTURE.md). For infrastructure/engineering rules, see [`TRD.md`](./TRD.md).

---

## Glossary (read this first — five terms that come up constantly)

- **Frontend** = the website itself, what you see and click in your browser. Built with React.
- **Backend** = everything that stores and protects data. We don't run our own backend server — we use **Supabase**, a service that gives us a database, login system, file storage, and "serverless functions" all in one.
- **Database (Postgres)** = where all the actual information lives — every user, message, team, notice. Organized into **tables** (think: spreadsheets — `profiles` table, `teams` table, etc.)
- **RLS (Row Level Security)** = a rule built directly into the database that says "this person is only allowed to see/edit these specific rows." This is the *real* security — even if someone messes with the website's code in their browser, the database itself still refuses to hand over data they're not allowed to see. Hiding a button in the app is just politeness; RLS is the lock.
- **Edge Function** = a small, separate piece of server code we run only when something needs a secret password (like our AI provider's API key) or a superpower action (like permanently deleting a user) that the website itself should never be trusted to do directly.

---

## 1. How the pieces fit together

Think of it in three layers:

1. **What you see** — the React website (runs in your browser).
2. **What holds the data** — Supabase: the database, login system, and file storage.
3. **What needs extra protection** — a handful of Edge Functions for anything involving secret keys or admin superpowers (deleting a user, sending emails, talking to the AI).

There's a fourth piece too: **Google Drive**. Course files (PDFs, slides) aren't stored on our own servers — they live in Google Drive folders that admins manage, and the website just displays them nicely.

**No separate "backend server" exists.** Some apps have a custom server in the middle handling requests — this app doesn't. The website talks directly to Supabase and directly to Google Drive. Anything that needs to happen "on a server" happens inside Supabase (as a database rule) or an Edge Function.

**Navigation isn't a normal set of web pages/URLs system** — the app tracks "which screen am I looking at" as a single value in memory and updates the browser's address bar to match, rather than using a typical page-routing library. Functionally it feels the same to a user (back button works, links work), just built differently under the hood.

---

## 2. Logging in and account types

**Logging in** uses email + password, handled by Supabase. When you log in, you get a session that proves who you are to every request the app makes afterward.

**Being "logged in" and being "an admin" are two completely separate things.** Logging in just proves you're *someone*. Being an admin is a yes/no flag stored on your profile (`is_admin`), and — importantly — that flag is checked by the database itself every time an admin action happens, not just by the website hiding admin buttons from regular users.

There are four separate status flags that control what a person can do:

| Flag | What it means |
|---|---|
| **Admin** | Can access the admin dashboard and do admin things |
| **Owner** | The one founder account — can never be banned, demoted, or deleted, even by another admin |
| **Alumni + Verified** | Someone claiming to be a graduate; "Verified" means an admin actually confirmed it |
| **Banned** | A restricted account — see below, it's not a full lockout |

**Why does the database double-check admin status instead of trusting the app?** Because someone technical could, in theory, talk to our database directly and skip the website entirely. If the "you're not an admin" check only lived in the app's code, that person could bypass it. Since the check lives in the database too, that door stays closed no matter how someone tries to get in.

### 2.1 Approving new alumni

When someone signs up claiming to be an alumnus, they don't get full access right away — they land in an **"Alumni Approval Queue"** that admins see on the dashboard, with a badge showing how many people are waiting.

- Admin clicks **Approve** → the person becomes "Verified," and an automatic email tells them they're approved and can now use their account.
- Admin clicks **Reject** → they're removed from the queue.

**Why require approval at all?** Anyone could type "I'm an alumnus" during signup. The approval step is a human sanity-check so students can trust that the people in the Alumni Directory are actually real graduates, not random signups.

### 2.2 Banning someone

A ban is **not** a full lockout — it only restricts the social/collaboration side of the app (team chat, connections, joining teams). A banned person can still read Study Materials. This is on purpose: a ban usually means "you behaved badly toward other students," not "you're not a student anymore" — so academic access stays open.

This restriction is enforced twice, for the reason explained above:
- The app itself hides every menu except Home for a banned user.
- The database *also* refuses to let a banned user's account post messages, send requests, etc. — even if someone tried to bypass the app's UI.

### 2.3 Permanently deleting a user

This is the one action serious enough that it doesn't run inside the regular app at all — it runs as an Edge Function, using a special all-powerful key that never touches the browser. Before deleting anyone, it automatically:
- Refuses if the target is the Owner (can't happen, ever).
- If they own a team, hands ownership to someone else in the team first, so the team isn't destroyed by accident.
- Cleans up all their scattered data (notifications, routines, chat history, etc.) so nothing is left behind pointing to a person who no longer exists.
- Writes a record of the deletion to an audit log, so there's always a paper trail of who deleted whom and when.

---

## 3. Study Materials (course files)

**Heads up:** there are currently two different versions of this system running on two different branches of the project. Know which one you're talking about.

### 3.1 The one students actually use today

**What it is:** instead of us hosting every PDF and slide deck ourselves, course files live in Google Drive folders that admins organize. The app is basically a nice-looking window into those folders — pick your department, then your semester, then your course, then Mid-term or Final, and you see the files.

**Why Google Drive instead of hosting files ourselves?** Storage and bandwidth for thousands of PDF downloads gets expensive fast. Google Drive gives us huge free storage and Google's own reliable file preview/download — we just build a nicer way to browse it.

**How an admin controls this:** in the admin panel, they tell the app "here's the Google Drive folder ID for the CSE department" — the app remembers that mapping in the database. If they ever need to move files to a new folder, they just update that one setting — no code changes, no deployment needed.

**Currently:** 9 departments exist in the system, but only **CSE (Computer Science) is actually turned on**. The other 8 show a "Coming Soon" card until someone connects their Drive folder.

### 3.2 A second, currently-unused option

There's a second system, already built, where admins could upload files *directly* through our app instead of Google Drive, storing them in our own file storage. Right now this has zero files in it — it's built but not being used. Worth knowing so nobody assumes any current course material got there through this path.

### 3.3 Admin's special Google Drive login

Browsing Drive folders (as a student, read-only) only needs a plain API key. But an *admin* uploading or deleting files needs to actually log in to Google with their own account and grant permission — that's a separate one-time "Connect Google Drive" login flow, completely different from the regular Edu51Portal login.

---

## 4. Alumni Hub & Mentorship

**What it is:** a directory where students can browse real, approved graduates, see their career info, and request mentorship — plus a private chat once a mentor says yes.

**How a mentorship starts:**
1. Student finds an alumnus in the directory and sends a mentorship request with a short message.
2. Alumnus sees the request and can accept or decline.
3. If accepted, a private chat thread opens between just the two of them.

**"Suggested Mentors"** — a small row of recommended alumni shown at the top of the directory, picked automatically based on matching major and overlapping skills/interests. It's simple scoring logic, not artificial intelligence — just "how many things do you two have in common."

**How alumni choose to be contacted:** each alumnus picks one of three modes —
- **Website** (default): students use our in-app request-and-chat system.
- **Social**: skip our chat entirely — show clickable WhatsApp/Facebook/Instagram/etc. icons instead, for alumni who'd rather be reached where they already check messages.
- **Both**: show everything.

**Alumni Resources:** alumni can upload career tips, job guides, or study material for students to browse and search, tagged by department.

---

## 5. Team Building

**What it is:** students form small project teams (2 to 7 people) for hackathons, coursework, or side projects — each team gets its own chat, task board, and file-sharing space.

### 5.1 Joining and creating teams
Anyone can create a team or request to join an existing one. The team owner (or an admin/co-admin they've added) approves join requests and can invite people directly.

### 5.2 Team Chat
Real-time group chat, only visible to team members. A few deliberate rules:
- **One reaction per person per message** — if you tap a new emoji, it replaces your old reaction rather than stacking a second one (like Messenger, not like Slack).
- **Only the team owner can delete other people's messages** — not co-admins, not our platform admins. This keeps moderation authority with whoever actually founded the team.
- **@mentioning someone** sends them a notification, and a push alert if they've enabled those.

### 5.3 Task Board (Kanban)
A simple three-column board — To Do, In Progress, Done — for tracking team work. Only the person assigned to a task (or an owner/admin) can drag it to a new column; unclaimed tasks can be moved by anyone. This stops someone from marking a teammate's task "done" without permission, while still letting genuinely shared work move freely. Assigning someone a task pings them with a notification.

### 5.4 Team Files
Team members can upload files. By default, a file is private to the team — but the owner/admin can flip it to "public," which makes it show up on a site-wide "Shared Resources" page other teams can browse. This is how genuinely useful files (templates, guides) end up reusable instead of stuck inside one team forever.

---

## 6. Networking (Connect with Classmates)

A simple, LinkedIn-style "connect" feature — send a request, the other person accepts or declines, and once accepted you show up on each other's connections list. There's a "Discover" tab to browse other students you're not connected to yet.

---

## 7. Admin Dashboard

Everything an admin needs, in one place:

- **Stats overview** — how much storage is used, how many users/teams exist, how many people are active right now.
- **User management** — promote someone to admin, ban/unban with a reason, or permanently delete an account.
- **Alumni Approval Queue** — approve or reject new alumni signups (see section 2.1).
- **Broadcast composer** — send a push notification and/or email to literally every user at once, for platform-wide announcements. Every broadcast is logged (how many people it reached, how many actually got delivered) so admins can check it worked.
- **Feedback inbox** — see everything users have submitted through the "Send Feedback" form, mark it reviewed/closed.
- **Study Material Manager** — the folder/file management tool described in section 3.

---

## 8. Notices & Notifications

**Notices** are announcements admins post (exam schedules, emergency info, general updates) — students see them in a panel, and can open one to view any attached image or PDF (like an exam routine).

**Two separate ways people get notified**, and admins can choose to send either or both:
- **Push notifications** — a small popup/alert on your phone or browser, even if the app isn't open (as long as you've allowed notifications and installed/enabled them once).
- **Email** — sent through Brevo, our email service (we used to use a different one called Resend, but switched for better reliability).

Certain actions trigger *automatic*, single-person notifications too — like being @mentioned in team chat, or having a task assigned to you — separate from the admin's platform-wide broadcasts.

---

## 9. AI Assistant

A small chat bubble in the corner (only visible if you're logged in) that answers questions about how to use the platform, and can help explain academic concepts — but it's deliberately built to **not** write essays or solve assignments for you; it's told to guide understanding, not hand over answers.

It's powered by Google's Gemini AI (their free tier), and every user gets a **30-message-per-day limit** — enforced by our server, not just the app, so it can't be worked around. Your chat history is only kept in your current browser tab — closing the tab clears it, and nothing is stored on our servers long-term. That's intentional, for privacy and simplicity.

### 9.1 What the AI "knows" — and how it remembers a conversation

AI models like Gemini don't actually have memory between messages — every single request is stateless, like talking to someone with amnesia who only knows what's written on the note you hand them. So "remembering" a conversation is really just **us re-sending the whole relevant conversation back to it every time**. This is worth understanding because it explains both what the assistant can and can't do.

**Two kinds of "context" go into every message it sends:**

1. **Its personality and knowledge of the platform** — a fixed block of instructions (the "system prompt") that's sent with *every single request*, invisibly, before your actual question. It tells the AI: who it is, what Edu51Portal's features are (Study Materials, Teams, Network, Resources, Routine, Semester Tracker), how to sound (direct, warm, no filler), and its one hard rule — explain concepts, don't write assignment answers for students. This never changes conversation to conversation; it's baked into every request.
2. **Recent conversation history** — the app keeps your last **10 exchanges** (question + answer pairs) in your browser's memory for the current tab, and resends them along with every new message you type, so the AI can follow up on "what did I just ask." Once you pass the 10th exchange, the oldest one quietly drops off — the AI can't recall something from earlier than that in the same conversation. Close the tab or open a new one, and it starts completely fresh with no memory of anything before.

**What it does *not* know:** anything about *you* specifically — not your grades, your specific courses, your team memberships, or your files. It only knows general facts about how the platform works, plus whatever you've typed in the current conversation. It's a knowledgeable guide to the platform and general study help, not a personal assistant with access to your account data.

**Why cap history at 10 exchanges instead of the whole conversation?** Every exchange sent adds to the cost and slows down the response — an unbounded history would keep growing and eventually make each reply slower and more expensive for no real benefit, since most questions only need the last few messages of context anyway.

---

## 10. Custom Routine & Semester Tracker

**Custom Routine** is a personal weekly class-schedule builder — add your classes, see them laid out in a grid (or a simpler day-by-day list on mobile), get warned if two classes overlap, and it automatically splits 3-hour lab sessions across the schedule correctly. It's tied to your account, so it follows you across devices — an earlier version stored this only on one device/browser, which meant switching phones lost your schedule; that's been fixed.

**Semester Tracker** shows your progress through the current academic semester (timeline, days remaining, etc.).

---

## 11. Keeping things safe (in plain terms)

- **The database is the real gatekeeper**, always — think of the app's buttons and menus as signage, and the database's rules as the actual locked doors.
- We found and fixed a real bug where three important tables could be edited by *any* logged-in user directly, bypassing the app entirely — that's now locked down to admins only.
- Admin-only actions in the database are explicitly locked so that only truly-admin accounts can even attempt to call them — not just "hidden," actually blocked.
- Search boxes (like searching alumni or admin user lists) had their input cleaned up to prevent a kind of attack where someone types special characters to trick the search into leaking data it shouldn't.
- Every password/API key that must stay secret (our AI provider key, our email provider key, etc.) lives only on the server side — never inside the website code that ships to your browser, which anyone could technically inspect.

---

## 12. Where things run

- The website is hosted on **Vercel** and rebuilds automatically whenever code is pushed.
- There are two live versions: the original **edu51portal.live** (older, single-department version) and the newer **bubt.edu51portal.live** (university-wide, multiple departments) — they're separate deployments from separate branches of the code.
- Security headers (things that stop the site from being embedded maliciously in another page, etc.) are applied automatically to every page.

---

## 13. Quick answers to common questions

- **"Who decides if someone's an admin?"** → A yes/no flag on their account, double-checked by the database every single time, not just by the app.
- **"Where do course PDFs actually live?"** → Mostly in Google Drive folders that admins manage — the app just displays them. A second option (uploading straight into our own storage) exists but isn't being used yet.
- **"Why can't I see materials for my department?"** → Only Computer Science (CSE) is fully connected right now — other departments will light up once an admin connects their Drive folder.
- **"Can a banned person still see study materials?"** → Yes, on purpose — a ban only blocks the social/team features, not academic access.
- **"Why are there two different chat systems (Team Chat and Mentor Chat)?"** → Team Chat is for a whole team talking together; Mentor Chat is always exactly one student and one alumnus, privately — different enough uses that they're built as two separate systems.
- **"Is the old World Cup 2026 feature really gone?"** → The feature and its data are gone; one small leftover background job still technically exists but does nothing and is scheduled for cleanup.
- **"If I'm building something new that needs a secret API key, where does it go?"** → Never in the website code — it goes in a server-side Edge Function, with the key stored securely on Supabase's side.
