# Project Plan — Edu51Portal

**Last updated:** June 17, 2026  
**Live:** edu51portal.live

---

## Current Status

The app is live and in active use by BUBT Intake 51 – Section 5 students.  
All Phase 1 social/team features are shipped.

---

## Completed

### Core Platform
- [x] Student dashboard (course browser, PDF viewer, file delivery)
- [x] Semester tracker (progress bar, timeline, exam countdown)
- [x] Custom routine builder
- [x] Admin dashboard (course manager, file upload, Drive integration)
- [x] Dark / light mode
- [x] Push notifications (VAPID + service worker)

### V2 Social Features (Phase 1)
- [x] LinkedIn-style profiles (avatar, cover, headline, education, experience, skills)
- [x] Connections (request / accept / discover)
- [x] Team Building (create / discover teams, roles, invitations, join requests, announcements)
- [x] Alumni Hub (directory, admin-verified)

### Infrastructure
- [x] Custom domain: edu51portal.live (Vercel A record)
- [x] Supabase migrations for all schema changes in `supabase/migrations/`
- [x] Codebase cleaned — no debug scripts or one-off SQL at root

---

## In Progress / Next

### V2 Phase 2 (Collaboration)
- [ ] **Team Chat** — realtime messages, replies, reactions (`team_messages` table)
- [ ] **Kanban Board** — per-team task board with drag-and-drop (`@dnd-kit`)
- [ ] **Team Files** — upload/download per team (private Supabase Storage bucket)
- [ ] **Notification Bell** — in-app notification center, realtime badge count

### Quality
- [ ] Add proper TypeScript types for all API responses (eliminate `any`)
- [ ] Error boundary wrappers on heavy pages (ProfilePage)
- [ ] Lighthouse audit pass on mobile — target 90+ performance

---

## Edge Function Secrets Required

| Secret | Where to set |
|--------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase |
| `VAPID_PRIVATE_KEY` | Supabase Dashboard → Edge Functions → Secrets |
| `VAPID_PUBLIC_KEY` | Supabase Dashboard → Edge Functions → Secrets |

---

## Domain & Hosting

| Service | Value |
|---------|-------|
| Vercel project | `edu51five` |
| Primary domain | `edu51portal.live` (A record → 216.198.79.1) |
| Fallback domain | `edu51five.vercel.app` |
| DNS registrar | name.com |
