# Project Plan — Edu51Portal

**Last updated:** July 18, 2026
**Live:** edu51portal.live (main branch) · bubt.edu51portal.live (full-version branch)

---

## Branches

| Branch | Scope | Status |
|---|---|---|
| `main` | Original single-cohort build — BUBT Intake 51, CSE only, major-based Study Materials (`study_drive_config`) | Live, stable, receiving only critical fixes going forward |
| `full-version` | University-wide rebuild — all BUBT departments, department-based Study Materials (`study_department_config`), expanded alumni/admin systems | Active development, deployed to `bubt.edu51portal.live` |

See [`PRD.md`](./PRD.md) for how the two Study Materials flows differ technically.

---

## Completed

### Core Platform
- [x] Student dashboard (course browser, PDF viewer, file delivery)
- [x] Semester tracker (progress bar, timeline, exam countdown)
- [x] Custom routine builder (auth-scoped `user_routines`, overlap detection, 3hr lab auto-split, mobile agenda + desktop grid views)
- [x] Admin dashboard (course manager, file upload, Drive integration)
- [x] Dark / light mode
- [x] Push notifications (VAPID + service worker) — targeted and broadcast
- [x] Email notifications via Brevo (migrated off Resend)
- [x] AI Assistant (Gemini 2.5 Flash, rate-limited, JWT-verified)

### V2 Social Features (Phase 1)
- [x] LinkedIn-style profiles (avatar, cover, headline, education, experience, skills)
- [x] Connections (request / accept / discover)
- [x] Team Building (create / discover teams, roles, invitations, join requests, announcements)
- [x] Alumni Hub (directory, admin-verified)

### V2 Phase 2 (Collaboration) — all shipped
- [x] **Team Chat** — realtime messages, replies, reactions, @mentions, owner-only delete-others
- [x] **Kanban Board** — per-team task board, drag-and-drop, priority, assignee-gated moves, realtime sync
- [x] **Team Files** — upload/download per team, private/public visibility, cross-team public resources page
- [x] **Notification Bell** — in-app notification center, realtime badge count

### Alumni & Mentorship (expanded well beyond original directory scope)
- [x] Alumni self-service profile (skills, achievements, portfolio, social links, contact mode, work experience)
- [x] Mentorship request → accept → 1:1 mentor chat flow
- [x] Suggested Mentors (major + skill/interest overlap scoring)
- [x] Alumni resource sharing (career tips, job guides, study material, industry insights)
- [x] **Admin Alumni Approval Queue** — new alumni gated behind `is_verified` until admin-approved

### Admin & Security
- [x] Admin ban (materials-only restriction, RLS-enforced not just UI-hidden) / unban with reason
- [x] Admin permanent delete (service-role Edge Function, owner-protected, ownership transfer, orphan cleanup, audit log)
- [x] Admin stats dashboard (storage/user/team counts via single RPC)
- [x] Feedback inbox (submit → admin review → status)
- [x] Broadcast composer (push + email to all subscribers, delivery logging via `notification_logs`)
- [x] RLS lockdown on `materials`/`courses`/`users` (previously publicly writable — fixed)
- [x] Least-privilege admin RPC grants (revoked anon/public execute)
- [x] Search-filter SQL/ilike injection sanitization

### Study Materials Restructure (`full-version`)
- [x] Department → Semester → Course → Mid/Final hierarchy (`study_department_config`, `profiles.department`)
- [x] 9 departments defined, department-aware admin Drive panel
- [x] Semester folder card UI redesign (numbered grid tiles)
- [x] Redesigned department picker (3D card-stack, banner image/video per dept)

### Removed
- [x] World Cup 2026 feature fully removed (table, cron, UI) — **note:** `sync-wc26-matches` Edge Function is still deployed and dead; deletion still pending (see Next)
- [x] Semester tracker sidebar removed in favor of centered-modal routine builder

### Infrastructure
- [x] Custom domains: edu51portal.live + bubt.edu51portal.live (Vercel)
- [x] Supabase migrations for all schema changes in `supabase/migrations/`
- [x] Vendor chunk splitting + lazy-loaded views (17 heavy components) for load performance
- [x] Codebase cleaned — no debug scripts or one-off SQL at root

---

## In Progress / Next

### Study Materials rollout
- [ ] Wire up Google Drive root folders for the remaining 8 departments (EEE, Textile, Civil, DSE, BBA, English, Economics, LLB) — currently "Coming Soon"
- [ ] Decide the fate of the unused Supabase-hosted upload path (`study_folders`/`study_materials`, 0 rows) — keep as a fallback upload option or remove
- [ ] Decide whether/when to retire the legacy `main`-branch major-based flow once `full-version` fully replaces it

### Cleanup
- [ ] Delete dead `sync-wc26-matches` Edge Function (leftover from removed WC26 feature)
- [ ] Remove legacy `materials`/`courses` tables (0 rows, pre-Drive-integration leftovers) once confirmed nothing references them
- [ ] Resolve uncommitted `src/App.tsx` drift (notice-composer publish-toggle removal, email-toggle thumb alignment fix)

### Quality
- [ ] Add proper TypeScript types for all API responses (eliminate `any`)
- [ ] Error boundary wrappers on heavy pages (ProfilePage)
- [ ] Lighthouse audit pass on mobile — target 90+ performance
- [ ] Automated test coverage — currently none (see [`TRD.md`](./TRD.md) § Testing)

---

## Edge Function Secrets Required

| Secret | Where to set | Used by |
|--------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase | `admin-delete-user` |
| `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` | Supabase Dashboard → Edge Functions → Secrets | `send-push-notification` |
| `GEMINI_API_KEY` | Supabase Dashboard → Edge Functions → Secrets | `ai-chat` |
| Brevo API key | Supabase Dashboard → Edge Functions → Secrets | `send-email-notification`, `send-password-reset` |

Full technical/infra reference: [`TRD.md`](./TRD.md).

---

## Domain & Hosting

| Service | Value |
|---------|-------|
| Vercel project | `edu51five` |
| Primary domain | `edu51portal.live` (main branch) |
| Full-version subdomain | `bubt.edu51portal.live` (full-version branch) |
| Fallback domain | `edu51five.vercel.app` |
| DNS registrar | name.com |
