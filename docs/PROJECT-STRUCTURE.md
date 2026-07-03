# Project Structure

Feature → file → approximate line numbers.

---

## Routing & App Shell

| What | File | Lines |
|------|------|-------|
| View union type & state | `src/App.tsx` | 134–151 |
| URL → view parser | `src/App.tsx` | 152–170 |
| `goToView` (push history) | `src/App.tsx` | 186–230 |
| Popstate listener | `src/App.tsx` | 250–285 |
| Sidebar menu | `src/App.tsx` | 3374–3550 |
| Fullscreen render branches | `src/App.tsx` | 8550–8630 |
| Header / layout | `src/components/Layout/Header.tsx` | — |
| Desktop nav pill bar | `src/components/ui/nav-header.tsx` | framer-motion spring-animated highlight pill that follows hover/active tab; `layoutId="nav-cursor"` for smooth transitions; dark/light aware; LIVE/NEW/SOON badges; login guards. Redesigned 2026-06-20: fully transparent header (no background panel), floating pill container with `backdrop-blur`, unclipped logo 44×44 with drop-shadow, 68px desktop height, gradient active pill, blue-tinted active icon, polished auth buttons (white Login / blue Create Account with scale hover). |

---

## Auth

| What | File | Lines |
|------|------|-------|
| Sign-in modal | `src/components/SignInModal.tsx` | — |
| Sign-up modal | `src/components/SignUpModal.tsx` | — |
| Reset password modal | `src/components/ResetPasswordModal.tsx` | — |
| Set new password modal | `src/components/SetNewPasswordModal.tsx` | — |
| Change email modal | `src/components/ChangeEmailModal.tsx` | — |
| Register modal (legacy) | `src/components/RegisterModal.tsx` | — |
| Auth session listener | `src/App.tsx` | 530–660 |

---

## Admin Access (DB-based)

Admin is gated by `profiles.is_admin` (no public password page). `isAdmin` is derived from the signed-in user's profile; the admin view is route-guarded.

| What | File | Lines |
|------|------|-------|
| `isAdmin` route guard (redirects non-admins off `/admin`) | `src/App.tsx` | ~233 |
| Authoritative `isAdmin` resolver (session-bound `is_app_admin()` RPC) | `src/App.tsx` | ~356 |
| Admin entry: profile-page button only (`onOpenAdmin`) | `src/components/Profile/ProfilePage.tsx` | — |
| Exit-admin button (header) | `src/App.tsx` (`handleExitAdmin`) | — |
| Admin Users promote/demote section | `src/components/Admin/AdminDashboard.tsx` | — |
| Admin users load + toggle handlers | `src/App.tsx` (`loadAdminUsers`, `handleToggleUserAdmin`) | — |
| **SQL:** `is_app_admin()`, `set_user_admin()`, `admin_list_users()` | migration `admin_auth` | — |

---

## Admin Stats (real-time)

| What | File | Lines |
|------|------|-------|
| Stat cards (Storage gauge, Users, Teams, Active) | `src/components/Admin/AdminDashboard.tsx` | ~250 |
| Stats fetch (`get_admin_stats` RPC) | `src/App.tsx` (`loadAdminStats`, admin-open effect) | — |
| **SQL:** `get_admin_stats()` (storage usage + counts) | migration `admin_stats` | — |

---

## User Feedback

| What | File | Lines |
|------|------|-------|
| Feedback modal (categories, subject, message) | `src/components/FeedbackModal.tsx` | — |
| Footer "Send Feedback" link | `src/App.tsx` | ~4760 |
| Feedback API (submit / list / update status) | `src/lib/api/feedbackApi.ts` | — |
| Feedback types | `src/types/index.ts` | — |
| Admin Feedback Inbox (filters, status control) | `src/components/Admin/AdminDashboard.tsx` | — |
| Feedback load + status handlers | `src/App.tsx` (`loadFeedback`, `handleUpdateFeedbackStatus`) | — |
| **DB:** `feedback` table — public insert, admin-only read/update (RLS via `is_app_admin()`) | migration `feedback` | — |

---

## Profiles (Social)

| What | File | Lines |
|------|------|-------|
| Profile page (main) | `src/components/Profile/ProfilePage.tsx` | — |
| Edit basic info modal | `src/components/Profile/EditBasicInfoModal.tsx` | — |
| Education section | `src/components/Profile/EducationSection.tsx` | — |
| Experience section | `src/components/Profile/ExperienceSection.tsx` | — |
| Skills editor | `src/components/Profile/SkillsEditor.tsx` | — |
| Profile API | `src/lib/api/profileApi.ts` | — |
| Social types | `src/types/social.ts` | — |
| Supabase client | `src/lib/supabase.ts` | — |
| Storage helpers | `src/lib/storage.ts` | — |

---

## Connections (Network)

| What | File | Lines |
|------|------|-------|
| Network page (tabs: Connections / Requests / Discover) | `src/components/Network/NetworkPage.tsx` | — |
| User card | `src/components/Network/UserCard.tsx` | — |
| Connections API | `src/lib/api/connectionsApi.ts` | — |

---

## Team Building

| What | File | Lines |
|------|------|-------|
| Teams list page (Discover / My Teams) | `src/components/Teams/TeamsPage.tsx` | — |
| Team detail page (Overview / Members / Chat tabs) | `src/components/Teams/TeamPage.tsx` | — |
| Team card | `src/components/Teams/TeamCard.tsx` | — |
| Create team modal | `src/components/Teams/CreateTeamModal.tsx` | — |
| Invite members modal | `src/components/Teams/InviteMembersModal.tsx` | — |
| Teams API | `src/lib/api/teamsApi.ts` | — |

---

## Team Chat (Phase 2)

Real-time chat inside each team. Members-only. Non-members see a join prompt.

| What | File |
|------|------|
| Chat UI (message list, reply, reactions, realtime) | `src/components/Teams/TeamChat.tsx` |
| Chat API (listMessages, sendMessage, deleteMessage, toggleReaction) | `src/lib/api/chatApi.ts` |
| `TeamMessage` type | `src/types/social.ts` |
| **DB:** `team_messages` + `team_message_reactions` tables, RLS gated by `team_members` | migration `team_chat` |

**Realtime:** Supabase channel `team-chat-{teamId}` — subscribes to INSERT/DELETE on `team_messages` and `*` on `team_message_reactions`.  
**Reactions:** 5 fixed emoji (👍 ❤️ 😂 😮 🔥), Messenger-style — one reaction per user per message (PK `(message_id, user_id)`), clicking a different emoji swaps it, same emoji toggles off (`setReaction` in `chatApi.ts`). Optimistic UI update on click; reaction badge overlaps the bubble's bottom corner.  
**Reply threading:** `reply_to_id` FK on `team_messages`; reply snippet (sender name + truncated content) shown above the bubble.  
**Who reacted:** clicking a reaction badge opens a popover listing reactors by emoji (names resolved from team members).  
**@Mentions:** typing `@` opens a member autocomplete (↑/↓/Enter/Tab to pick); mentioned names render highlighted in the bubble, with a stronger amber highlight when you are the one mentioned.  
**Delete rules:** a user can delete only their own messages; the **team owner** can delete anyone's. Team admins/members and the app admin cannot delete others' messages (UI: `isOwn || isOwner`; DB RLS `chat_delete`: author or team `role = 'owner'`).

---

## Team Tasks Board (Kanban, Phase 2)

Collaborative Kanban board per team — third-party member contribution, with realtime sync added.

| What | File |
|------|------|
| Board UI (3 columns, drag-and-drop, filters, add/edit modals) | `src/components/Teams/TeamTasksBoard.tsx` |
| Tasks API (`listTeamTasks`, `createTeamTask`, `updateTeamTask`, `deleteTeamTask`) | `src/lib/api/teamsApi.ts` |
| `TeamTask` type | `src/types/social.ts` |
| Tab integration ("Tasks" tab, member-gated) | `src/components/Teams/TeamPage.tsx` |
| **DB:** `team_tasks` table + RLS | migration `20260618120000_team_tasks` |

**Columns:** `todo` / `in_progress` / `done`. Each task has title, description, assignee, priority, due date, creator.  
**Priority:** `low` / `medium` (default) / `high` — colored badge on every card; filterable in the header.  
**Move restriction (drag/status):** only the **assignee** or **owner/admin** can drag an assigned task to another column. Unassigned tasks are moveable by any member. Lock icon shown on cards the current user cannot drag. Status dropdown in edit modal is disabled for non-authorized users.  
**Assignment notification:** when owner/admin assigns (or re-assigns) a task, the new assignee receives a push notification via the `send-push-notification` edge function (`targetUserId` parameter — single-user targeting, not broadcast).  
**RLS:** any member can read/create/edit tasks; only the **task creator or team owner/admin** can delete (`delete_tasks` policy via `team_role()`).  
**Realtime:** Supabase channel `team-tasks-{teamId}` subscribes to `*` on `team_tasks` (filtered by `team_id`) and silently reloads the board, so drag/move/edit/delete by any member appears live for everyone.

---

## Team File Sharing (Phase 2)

Per-team file sharing with public/private visibility. Members upload; owner/admin can expose files publicly. A dedicated Shared Resources page shows all public files across all teams with team badge.

| What | File |
|------|------|
| Files tab UI (upload, drag-and-drop, grid, visibility toggle, realtime) | `src/components/Teams/TeamFiles.tsx` |
| Shared Resources page (search, type filter, team badge, load-more) | `src/components/Teams/PublicFilesPage.tsx` |
| API (listTeamFiles, listPublicFiles, uploadTeamFile, deleteTeamFile, setFileVisibility) | `src/lib/api/filesApi.ts` |
| `TeamFile` type | `src/types/social.ts` |
| Tab integration ("Files" tab, Paperclip icon) | `src/components/Teams/TeamPage.tsx` |
| Sidebar entry + `/shared-resources` route | `src/App.tsx` |
| **DB:** `team_files` table + RLS (member select, member insert, owner/admin update/delete) | migration `team_files` |
| **Storage:** `team-files` bucket (public, 20 MB limit, PDF/DOCX/XLSX/PNG/JPG/WebP) | migration `team_files_storage` |

**Visibility:** `private` (default) — team members only. `public` — all authenticated users; URL never shown to non-members for private files (DB RLS gates discovery).  
**Realtime:** Supabase channel `team-files-{teamId}` — INSERT/DELETE/UPDATE on `team_files`.  
**Path convention:** `{teamId}/{fileId}.{ext}` in `team-files` bucket.

---

## World Cup 2026 (Live Event)

| What | File | Lines |
|------|------|-------|
| WC26 page (Pick Team / Leaderboard / Matches tabs) | `src/components/WorldCup/WorldCupPage.tsx` | — |
| Intro modal (one-time, post-login) | `src/components/WorldCup/WC26IntroModal.tsx` | — |
| 48 teams data + logo helpers | `src/lib/wc26Teams.ts` | — |
| Sync + leaderboard API | `src/lib/api/worldCupApi.ts` | — |
| Edge function: sync matches from football-data.org | `supabase/functions/sync-wc26-matches/index.ts` | — |
| App: intro modal trigger (SIGNED_IN) | `src/App.tsx` | 562, 645 |
| App: render branch | `src/App.tsx` | 8600–8621 |

**Database:** `wc26_matches` table — home/away team TLA codes, scores, status, stage, group  
**Scoring:** win = 3 pts, draw = 1 pt, +1 per goal scored by picked team  
**Sync:** server-side `pg_cron` job (`sync-wc26-matches-every-minute`, migration `20260704040331_wc26_cron_and_realtime`) invokes the edge function every 60s via `pg_net`, independent of any client being open. Frontend no longer polls the edge function — it subscribes to Supabase Realtime (`postgres_changes` on `wc26_matches`) and refetches from the DB the instant a row changes. Manual refresh button still force-syncs via `syncWC26Matches(true)`.  
**Stages:** `GROUP_STAGE` → `LAST_32` → `LAST_16` → `QUARTER_FINALS` → `SEMI_FINALS` → `THIRD_PLACE` → `FINAL` (must match football-data.org's stage enum exactly — `STAGE_ORDER`/`STAGE_LABEL` in `WorldCupPage.tsx`)

---

## Study Materials System

Google Drive-backed study material management. Admin manages Drive directly; students browse live Drive content.

| What | File |
|------|------|
| Drive API — read (list, icon, size, preview) + write (upload, delete, create folder) | `src/lib/driveApi.ts` |
| API (Drive config CRUD + Supabase folder/material helpers) | `src/lib/api/studyApi.ts` |
| Admin panel shell (tabs: Folders & Files / Drive Config) | `src/components/Admin/MaterialManager.tsx` |
| **Admin Drive panel** — browse & manage Drive: upload, delete, create folders, signed-in Google profile | `src/components/Admin/AdminDrivePanel.tsx` |
| Google Drive OAuth hook (popup + postMessage, module-level token cache, auto profile fetch) | `src/hooks/useGoogleDriveAuth.ts` |
| OAuth callback static page (sends postMessage → closes, never loads React/Supabase) | `public/oauth-callback.html` |
| Admin-only raw Drive browser (full folder tree, used inside admin panel) | `src/components/Student/GDriveBrowser.tsx` |
| **Student course list** — course cards per major, left-accent design, reads `courseFolders.ts` | `src/components/Student/GDriveFolderBrowser.tsx` |
| **Student course detail** — Mid/Final underline tabs, file list w/ preview & download | `src/components/Student/GDriveCourseView.tsx` |
| Static major → Drive root folder ID map (incl. `skipCommon` flag for AI) | `src/config/courseFolders.ts` |
| **DB:** `study_folders` + `study_materials` (Supabase uploads) | migration `20260626000000_study_materials` |
| **DB:** `study_drive_config` (major → GDrive folder ID mapping) | applied via MCP |
| **Storage:** `study-materials` bucket (50 MB, public) | migration `20260626000000_study_materials` |

**Admin OAuth:** implicit flow (`response_type=token`) using `window.open()` popup + `postMessage`. Redirect URI is `/oauth-callback.html` (static file) to avoid Supabase's `detectSessionFromUrl` overwriting the main session. Google's COOP header blocks `popup.closed`/`popup.close()` from parent — popup closes itself; parent only listens for `GDRIVE_OAUTH_SUCCESS` message. Scope: `drive openid profile email`.  
**Admin Drive Config tab:** admin sets GDrive folder ID per major (AI / Software Eng / Networking). No code change needed to update root folders.  
**Student flow:** `GDriveFolderBrowser` lists course folders for the student's major (+ Common unless `skipCommon`) → selecting a course opens `GDriveCourseView`, which finds Mid/Final subfolders and lists files with preview/download. Both fetch live from the Google Drive API (`VITE_GOOGLE_API_KEY`) on each navigation — no cache. `GDriveBrowser` (raw folder tree) is admin-only, reachable only from the admin panel.  
**Error boundary:** `RootErrorBoundary` in `main.tsx` catches all React render crashes and displays the error + stack trace instead of a blank page.  
**RLS:** authenticated read; `is_app_admin()` for all writes  
**Majors:** `'AI'`, `'Software Engineering'`, `'Networking'` (Common removed from admin view)

---

## Student / Academic Features

| What | File | Lines |
|------|------|-------|
| Home dashboard | `src/components/Student/IntakeView.tsx` | — |
| Section view | `src/components/Student/SectionView.tsx` | — |
| Course view | `src/components/Student/CourseView.tsx` | — |
| Semester tracker | `src/components/SemesterTracker.tsx` | — |
| Custom routine | `src/components/Student/CustomRoutine.tsx` | Modern redesign (2026-07-02): 280px form sidebar + colorful timetable grid. Per-day accent headers (Sun=sky, Mon=violet, Tue=amber, Wed=emerald, Thu=rose) as compact pills in a sticky row. Fixed-height grid (440px) with percentage-based absolute positioning for cards. Time column shows hour ranges ("8–9 AM"). Full-width break overlay spanning all columns. Notes column (right, `minmax(140px, 190px)`) with editable per-slot textareas persisted to `localStorage`. Download via `window.print()`. Syncs to `user_routines` table (auth-scoped). All logic unchanged (overlap detection, 3hr lab auto-split, RLS). |
| Exam materials dashboard | `src/components/Student/ExamMaterialsDashboard.tsx` | — |
| PDF viewer | `src/components/PDFViewer.tsx` + `PDFViewer.css` | Fullscreen-capable modal with dark/light mode, entry animation, loading/error states, responsive sizing via CSS (`dvh`, `min()`), no emojis — fully keyboard and touch accessible |
| Material viewer modal | `src/App.tsx` (~line 7789) | Inline modal opened via `openMaterialViewer(material)` from GDriveCourseView. Redesigned 2026-06-20: backdrop blur, color-coded file type icons, gradient header, dark/light aware, `pdf-scale-in` entry animation. |
| Major card stack | `src/components/ui/MajorCardStack.tsx` | Fan/stack animated card picker (framer-motion). Full-bleed glassmorphism cards with per-major glow ring. Logged-in user's major is foregrounded; guest starts at index 0. Swipe, drag, keyboard, and dot-nav supported. Redesigned 2026-06-21: removed separate info panel, all content overlaid on image with glass tags, white CTA arrow, colored `glowColor` box-shadow per major (AI=purple, SE=indigo, NET=emerald). |
| Search | `src/components/Search/` | — |

---

## Admin

| What | File | Lines |
|------|------|-------|
| Admin dashboard | `src/components/Admin/AdminDashboard.tsx` | — |
| Broadcast composer + live email preview | `src/components/Admin/AdminDashboard.tsx` | ~288–435 |
| Broadcast send handler (push + email) | `src/App.tsx` | ~2442 |
| File upload | `src/components/Admin/FileUpload.tsx` | — |
| Study material manager (admin CRUD) | `src/components/Admin/MaterialManager.tsx` | Major tabs, recursive folder tree, drag-and-drop file upload queue, inline rename/delete with confirm |

---

## Notices (Smart Notice)

| What | File | Lines |
|------|------|-------|
| Create/Edit notice form (category, priority, exam type, routine upload) | `src/App.tsx` | ~7040 |
| Notice create/update handlers (upload + persist attachment) | `src/App.tsx` (`handleCreateNotice`, `handleUpdateNotice`) | ~2600 |
| Routine attachment upload helper (image or PDF → `exam-routines`) | `src/lib/storage.ts` (`uploadRoutineAttachment`) | — |
| User notice panel — list row + attachment badge | `src/App.tsx` | ~3915 |
| Notice detail modal — image inline / PDF "View Routine" | `src/App.tsx` | ~7399 |
| Notice type (incl. `attachment_url`, `attachment_type`) | `src/types/index.ts` | — |
| **DB:** `notices.attachment_url` / `attachment_type`; admin-only `exam-routines` bucket writes | migration `notice_attachment` | — |

Note: hardcoded midterm/final routine templates and prebuilt insert functions were removed — admins now upload the routine as an image/PDF.

---

## Email & Push Notifications

| What | File | Lines |
|------|------|-------|
| Broadcast email HTML template (recipient-facing, no admin link) | `src/lib/emailNotifications.ts` | ~18 (`generateEmailHTML`) |
| Send email to all students | `src/lib/emailNotifications.ts` | ~349 (`sendEmailToAllStudents`) |
| Email content templates | `src/lib/emailTemplates.ts` | — |
| Push API helpers | `src/lib/pushNotifications.ts` | — |
| VAPID / subscription logic | `supabase/functions/send-push-notification/` | — |
| Service worker | `public/sw.js` | — |
| In-app notification API (mentions, mark-read) | `src/lib/api/notificationsApi.ts` | — |
| **DB:** `notifications` table + RLS + realtime | migration `20260621_notifications.sql` | — |

---

## Legal Pages

| What | File | Lines |
|------|------|-------|
| Terms & Conditions page | `src/App.tsx` | `currentView === "terms"` branch |
| Privacy Policy page | `src/App.tsx` | `currentView === "privacy"` branch |
| Footer links (Terms · Privacy) | `src/App.tsx` | footer bottom bar + Support column |

---

## Database Migrations

All migrations in chronological order under `supabase/migrations/`. Key ones:

| Migration | Purpose |
|-----------|---------|
| `20260210_profiles_social.sql` | Social columns on profiles (avatar_url, headline, skills…) |
| `20260210_connections.sql` | Connections table |
| `20260210_teams.sql` | Teams + team_members + invitations + join requests |
| `20260210_storage_buckets.sql` | avatars + team-assets buckets |
| `20260616_wc26.sql` | wc26_matches table + wc26_team on profiles |
| `wc26_matches_nullable_teams` | Allow NULL home/away for knockout TBD rounds |
| `admin_auth` | `is_app_admin()`, `set_user_admin()`, `admin_list_users()`; promote owner |
| `admin_stats` | `get_admin_stats()` — storage usage + user/team counts (admin-only) |
| `feedback` | `feedback` table — public insert, admin-only read/update via RLS |
| `notice_attachment` | `notices.attachment_url`/`attachment_type` + admin-only `exam-routines` writes |
| `admin_functions_least_privilege` | Revoke anon/public execute on admin RPCs |
| `notices_admin_write` | Notices: public read, admin-only insert/update/delete (`is_app_admin()`) |
| `team_chat` | `team_messages` + `team_message_reactions` tables with member-only RLS |
| `team_chat_realtime` | Add chat tables to `supabase_realtime` publication |
| `reactions_one_per_user` | Reaction PK → `(message_id, user_id)` — Messenger-style single reaction |
| `owner_protection` | `profiles.is_owner`; `set_user_admin` refuses to demote owner |
| `chat_delete_owner_only` | Chat delete restricted to author or team owner |
| `20260618120000_team_tasks` | `team_tasks` table + RLS (Kanban board) |
| `team_tasks_realtime` | Add `team_tasks` to `supabase_realtime` publication |
| `team_tasks_priority` | Add `priority` column (`low`/`medium`/`high`) to `team_tasks` |
| `20260630000000_lock_down_public_write_rls` | Lock `materials`/`courses`/`users` writes to `is_app_admin()` — previously any anon/authenticated client could insert/update/delete these tables directly via the REST API |
| `20260701000000_ai_chat_usage` | `ai_chat_usage` table — per-user daily message counter for AI Assistant rate-limiting |
| `20260702000000_user_routines` | `user_routines` table (auth-scoped, replaces anonymous device-UUID `custom_routines`) |
| `20260704040331_wc26_cron_and_realtime` | Enables `pg_cron`/`pg_net`; schedules `sync-wc26-matches` every 60s server-side; adds `wc26_matches` to `supabase_realtime` publication (`REPLICA IDENTITY FULL`) |

---

## Supabase Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `sync-wc26-matches` | On-demand (client throttled) | Fetch & upsert WC2026 matches from football-data.org |
| `send-push-notification` | DB trigger / admin action | Send Web Push to subscribed users |
| `send-email-notification` | Admin action | Send transactional/broadcast emails via Brevo |
| `send-password-reset` | User action | Send password reset email |
| `exam-reminder` | Scheduled / admin | Send exam reminder notifications |
| `ai-chat` | On-demand (chat widget) | Verifies caller JWT, enforces 30 msg/day rate limit via `ai_chat_usage`, proxies to Gemini 2.5 Flash — current version: v5 |

---

## AI Assistant

Floating chat widget (bottom-right, logged-in students only) for platform-navigation help and general academic Q&A, backed by Gemini's free tier.

| What | File |
|------|------|
| Chat widget (toggle button + panel) | `src/components/AIAssistant/AIAssistant.tsx` |
| Client API wrapper (`supabase.functions.invoke('ai-chat', ...)`) | `src/lib/api/aiChatApi.ts` |
| Edge function — JWT verification, rate limiting, Gemini proxy | `supabase/functions/ai-chat/index.ts` |
| **DB:** `ai_chat_usage` (daily message counter per user) | migration `20260701000000_ai_chat_usage` |
| **Secret:** `GEMINI_API_KEY` | Supabase Edge Function secrets (dashboard) — never in client env |

**Design:** glowing violet/indigo toggle button (`w-14 h-14 rounded-full`) with framer-motion icon swap; panel rendered via `createPortal` into a dedicated `#ai-assistant-portal` div appended to `<body>` (avoids scroll issues caused by `body { display:flex }` and ancestor `transform` from framer-motion). Panel uses independent `position:fixed` inline styles — not Tailwind classes — to guarantee positioning across all browsers. Panel: `w-340px`, `height:480px`, `max-height:calc(100vh-140px)`. Violet/indigo gradient matches platform palette.  
**Auth:** `verify_jwt: true` at the Supabase platform level (rejects unauthenticated before function runs) *and* internal `supabase.auth.getUser()` verification — defense in depth, since this endpoint burns shared free-tier quota.  
**Rate limit:** 30 messages/user/day tracked in `ai_chat_usage` (service-role client bypasses RLS for writes). Students can `SELECT` their own row only.  
**History:** `sessionStorage` only (key: `edu51five_ai_chat_{userId}`) — resets per browser tab, zero server-side retention. Welcome message is always overwritten from the constant on load so stale cached text never shows.  
**Model:** `gemini-2.5-flash` (free tier). `gemini-2.0-flash` was tried first but has `limit:0` quota on this API key project.  
**System prompt:** hardcoded in the edge function — scoped to all BUBT Intake 51 sections/majors, describes all platform features, instructs 1–3 sentence replies, human tone, no assignment/exam solutions.  
**Scope:** all Intake 51 students across all sections (not Section 5 only — updated in edge function v5).

---

## Performance

| What | File | Detail |
|------|------|--------|
| Vendor chunk splitting | `vite.config.ts` | `manualChunks` splits react / supabase / framer-motion / lucide into separately cached bundles |
| Lazy-loaded views | `src/App.tsx` | 17 heavy components converted to `React.lazy`; single `<Suspense>` spinner boundary wraps all view branches |
| `startTransition` on navigation | `src/App.tsx` (`goToView`, popstate handler) | Prevents React 18 "suspended during synchronous input" crash when navigating to a lazy view |
| `listTeamMembers` join | `src/lib/api/teamsApi.ts` | Single Supabase join query replaces 2 sequential round-trips (N+1 fix) |
| `loading="lazy"` on images | `TeamCard`, `TeamPage`, `UserCard` | Off-screen avatars/banners deferred until they scroll into view |

---

## Security & Deployment

| What | File | Detail |
|------|------|--------|
| Security headers (CSP frame-ancestors, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy) | `vercel.json` | Applied to all routes via Vercel `headers` config |
| SEO sitemap + crawl rules | `public/sitemap.xml`, `public/robots.txt` | Submitted to Google Search Console |
| Production env vars | Vercel dashboard (Project → Settings → Environment Variables) | `.env.production` is gitignored — never committed; all `VITE_*` keys live in Vercel only |
| RLS lockdown: `materials`/`courses`/`users` | migration `20260630000000_lock_down_public_write_rls` | These tables previously allowed public (anon+authenticated) INSERT/UPDATE/DELETE with no auth check — locked to `is_app_admin()` |

| Custom routine storage | migration `20260702000000_user_routines` | Replaced anonymous device-UUID `custom_routines` table with auth-scoped `user_routines` (`user_id` references `auth.users`). Full RLS: users read/write only their own rows. Old table dropped. |

---

## Announcement Banner

Top-of-page dismissible banner shown on the home/main views (not inside fullscreen views like Teams, Semester, etc.).

| What | File | Detail |
|------|------|--------|
| Banner state + dismiss | `src/App.tsx` | `showAnnouncementBanner` (useState, initialised from `localStorage`), `bannerExpanded` (useState) |
| Dismiss key | `localStorage` | `edu51five_banner_update1_dismissed` — bump the key name to force the banner to reappear for all users after a content update |
| Expand/collapse | click on text area | Collapsed: single-line summary with "tap for more". Expanded: full message. Tap again to collapse. |
| Dismiss (X) | button right side | Sets localStorage key + hides banner for the session |

**Current message (update1):** "Update in progress · Edu51Portal is evolving with new features regularly. Built by CoreWe-5" (collapsed) / full expanded version explains regular updates, design changes, team name CoreWe-5.  
**Team name:** CoreWe-5 (not "Core We 5" or "Core We-5").

---

## Key Conventions

- **Routing:** state-based (`currentView` string union), no react-router at runtime
- **Dark mode:** `isDarkMode: boolean` prop passed down to every page/modal
- **Images:** `avatar_url` (Supabase Storage) with legacy `profile_pic` (base64) fallback
- **Team logos:** `/public/world-cup-2026-logos/{team-name}.png` via `teamLogoUrl()` helper
- **Tailwind + daisyUI 5.5** for all UI; lucide-react for icons
- **Realtime:** `supabase.channel().on("postgres_changes", …).subscribe()` pattern (see App.tsx ~1107)
