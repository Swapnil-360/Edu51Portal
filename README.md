# Edu51Portal

Academic portal for **BUBT Intake 51 – Section 5** students. Built as a fast, fullstack SPA with realtime features, social profiles, and team collaboration.

**Live:** [edu51portal.live](https://edu51portal.live) · [edu51five.vercel.app](https://edu51five.vercel.app)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3.4 + daisyUI 5.5 |
| Backend / DB | Supabase (PostgreSQL + RLS + Edge Functions) |
| Auth | Supabase Auth (email/password + magic link) |
| Storage | Supabase Storage (avatars, team assets) |
| Hosting | Vercel |
| Push Notifications | Web Push API + VAPID + service worker |

---

## Features

### Core Academic & Campus
- **Student Dashboard** — intake and section view, course browser, file delivery (upload or Drive links)
- **Info Hub** — comprehensive university directory with 3 sub-sections:
  - *Faculty Directory:* 280+ professors across 9 departments (CSE, EEE, Civil, Textile, BBA, Law, Economics, English, Math) with real-time search, filters, and detailed modal profiles.
  - *Officials:* University leadership (Vice Chancellor Prof. Dr. A.B.M. Shawkat Ali profile and message) and administrative offices directory (Registrar, Exam Controller, IT, Proctor, Library, etc.).
  - *University Notices:* Live BUBT notices feed via serverless Edge API (`/api/notices`), categorized tags, PDF downloads, and automated weekly GitHub Actions sync.
- **PDF Viewer** — modal preview with fullscreen and mobile support
- **Semester Tracker** — real-time progress bar, milestone timeline, countdown to next exam
- **Custom Routine** — personal schedule builder with export
- **Admin Dashboard** — course manager, file upload, Drive integration, user management

### Social & Collaboration
- **LinkedIn-style Profiles** — avatar, cover photo, headline, education, experience, skills
- **Connections** — send / accept connection requests, discovery feed
- **Team Building** — create and discover teams (2–7 members), roles, invitations, join requests, announcements
- **Alumni Hub** — BUBT verified alumni network, community feed, department filters, suggested mentors carousel, and 1:1 mentorship requests with guest browsing

### Platform & Reliability
- **Live Data Sync** — automated weekly GitHub Actions workflow (`sync-faculty.yml`) + Node scraper (`scripts/sync-bubt-data.js`) syncing live university records.
- **Service Worker (PWA)** — versioned offline caching with dynamic `/api/*` route bypass.
- **Resilient Error Isolation** — global suppression of intrusive browser extensions and legacy permission policy violations.
- **Push Notifications** — service worker + VAPID, opt-in per user
- **Dark / Light Mode** — system-aware toggle persisted per user
- **Responsive** — mobile-first, tested on Chrome / Safari / Firefox

---

## Project Structure

See [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) for a full feature → file → line-number map.

---

## Local Setup

```bash
git clone https://github.com/Swapnil-360/Edu51Five
cd Edu51Five
npm install
cp .env.example .env          # fill in Supabase keys
npm run dev
```

Environment variables required (see `.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

---

## Database Migrations

All schema changes live in `supabase/migrations/`. Apply them in order via the Supabase CLI or MCP.

```bash
supabase db push   # applies pending migrations to remote
```

---

## Screenshots

| Dashboard | Semester Tracker |
|-----------|------------------|
| ![Dashboard](docs/dashboard.png) | ![Tracker](docs/tracker.png) |
