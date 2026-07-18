# Edu51Portal — Technical Requirements Document (TRD)

Companion to [`PRD.md`](./PRD.md) (feature theory/why) and [`PROJECT-STRUCTURE.md`](./PROJECT-STRUCTURE.md) (file/line locations). This doc covers the *engineering contract*: stack versions, environment/secrets, architecture constraints, non-functional requirements, and known technical debt — the things a new engineer or an infra/security reviewer needs before touching the system.

---

## 1. Architecture overview

```
Browser (React SPA, static bundle)
   │
   ├── Supabase client (@supabase/supabase-js)
   │      ├── Postgres (RLS-gated) — all app data
   │      ├── Auth — email/password, JWT sessions
   │      ├── Storage — avatars, team files, study materials, notice attachments
   │      ├── Realtime — postgres_changes subscriptions (chat, tasks, files)
   │      └── Edge Functions (Deno) — secret-holding / service-role logic
   │
   └── Google Drive API (direct, browser-side, VITE_GOOGLE_API_KEY) — study material files
```

**No custom backend server.** There is no Express/Fastify/Next.js API layer — the browser talks to Supabase and Google Drive directly. This is a hard architectural constraint, not a gap: any new "backend" logic must be either (a) a Postgres function/RPC, or (b) a Supabase Edge Function. Do not introduce a separate Node server unless there's a concrete reason Supabase's model can't cover it.

**No SSR/SSG.** Vite builds a static SPA (`vite build` → `dist/`). There is no server-rendered HTML — SEO relies on `public/sitemap.xml` / `robots.txt` and standard `<meta>` tags, not rendered content. Don't assume `window`/`document` are ever unavailable at runtime — but also don't assume any code runs on a server, because none of it does.

**Routing is not `react-router`-driven at runtime**, despite `react-router-dom` being a dependency — the app uses a hand-rolled `currentView` state union in `App.tsx` synced to `history.pushState`/`popstate`. New routes should follow this existing pattern rather than introducing a second routing paradigm.

---

## 2. Tech stack (versions as of this writing — check `package.json` for current)

| Layer | Choice | Version |
|---|---|---|
| Framework | React | 18.3 |
| Language | TypeScript | 5.5 |
| Build tool | Vite | 5.4 |
| Backend platform | Supabase (`@supabase/supabase-js`) | 2.57 |
| Styling | Tailwind CSS + daisyUI | Tailwind 3.4 / daisyUI 5.5 |
| Animation | Framer Motion | 12.40 |
| Icons | lucide-react | 0.344 |
| PDF rendering | `react-pdf` / `pdfjs-dist` / `@react-pdf/renderer` | 10.4 / 5.4 / 4.3 |
| Google OAuth (admin Drive) | `@react-oauth/google`, `gapi-script` | 0.12 / 1.2 |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights` | 1.5 / 1.2 |
| Linting | ESLint 9 + `typescript-eslint` 8 | — |
| Formatting | Prettier | 3.8 |
| Edge Functions runtime | Deno (via Supabase) | managed by Supabase |
| Hosting | Vercel | static build |

**Node/npm:** no `.nvmrc` committed — align with whatever Vercel's default Node runtime is for the project; don't assume a specific major without checking the Vercel project settings.

---

## 3. Environment variables & secrets

**Client-side (`VITE_*`, shipped to the browser — never put a real secret here):**

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key (safe to expose — RLS is the actual gate) |
| `VITE_GOOGLE_API_KEY` | Google Drive API key, **read-only** browsing of public Drive folders |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for the admin Drive-write flow |
| `VITE_VAPID_PUBLIC_KEY` | Web Push public key (paired with the private key held server-side) |

**Server-side (Supabase Edge Function secrets — dashboard-managed, never in `.env` files or `VITE_*`):**

| Secret | Used by |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `admin-delete-user` (auto-injected by Supabase runtime) |
| `VAPID_PRIVATE_KEY` | `send-push-notification` |
| `GEMINI_API_KEY` | `ai-chat` |
| Brevo API key | `send-email-notification`, `send-password-reset` |

**Rule, no exceptions:** if a value must stay secret, it is a Supabase Edge Function secret — never a `VITE_*` variable, since every `VITE_*` var is compiled into the public JS bundle and readable by anyone. `.env.production` is gitignored; all production values live in the Vercel dashboard only.

---

## 4. Security requirements

1. **RLS is mandatory on every table.** No new table ships without RLS enabled and an explicit policy — Postgres, not the React app, is the authorization boundary. A client-side `if (isAdmin)` check is UX only.
2. **Privilege escalation logic lives in `SECURITY DEFINER` Postgres functions** (`is_app_admin()`, `is_app_banned()`), not duplicated ad hoc in each policy — keeps the admin/ban definition in one place.
3. **Anything needing the service-role key or a third-party secret is an Edge Function**, never inlined into client code or a Postgres function callable by `anon`.
4. **Admin RPCs must explicitly revoke `anon`/`public` EXECUTE** (see migration `admin_functions_least_privilege`) — granting a function to `authenticated` by default is not enough if it's a sensitive admin action; check explicitly.
5. **User-supplied text used in `ilike`/pattern searches must be sanitized** (see `sanitizeIlikeTerm`) before interpolation — a prior filter-injection bug class.
6. **Security headers are enforced at the Vercel edge** (`vercel.json`): CSP `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`. Any new deployment target must carry the same headers.
7. **Owner protection:** exactly one `profiles.is_owner = true` row must always exist and must be un-demotable/un-bannable/un-deletable — this invariant is enforced in `set_user_admin()`, `admin_set_user_banned()`, and `admin-delete-user`; any new admin-mutation path touching users must add the same check.

---

## 5. Performance requirements / budgets

- **Vendor chunking is required, not optional** — `vite.config.ts` manually splits `react`, `@supabase`, `framer-motion`, `lucide-react` into separately cached chunks. New large dependencies should be evaluated for the same treatment; `chunkSizeWarningLimit` is set to 600 KB as the trip-wire.
- **Heavy views must be `React.lazy`-loaded** behind the existing single `<Suspense>` boundary in `App.tsx` — 17 components already follow this; new full-page views should too, especially anything pulling in `framer-motion`, PDF rendering, or Drive browsing.
- **Navigation must use `startTransition`** (`goToView`, the `popstate` handler) — required to avoid React 18's "suspended during synchronous input" crash when navigating into a lazy-loaded view. Skipping this on a new nav path will intermittently crash navigation.
- **No client-side caching of Google Drive listings** — current design fetches live on every navigation by choice (freshness over speed, and Drive's own API is fast enough). Don't "optimize" this into a stale cache without discussing the tradeoff — admins expect uploads to appear instantly for students.
- **Images:** off-screen avatars/banners use `loading="lazy"` (`TeamCard`, `TeamPage`, `UserCard`) — follow this convention for any new image grid/list.
- **Target:** Lighthouse mobile performance ≥ 90 (currently a tracked, not-yet-verified goal — see `PLAN.md`).

---

## 6. Realtime requirements

Every live-updating feature uses a Supabase Realtime channel scoped to the relevant entity ID, subscribed to `postgres_changes`:

| Feature | Channel pattern | Events |
|---|---|---|
| Team Chat | `team-chat-{teamId}` | INSERT/DELETE on `team_messages`, `*` on `team_message_reactions` |
| Team Tasks | `team-tasks-{teamId}` | `*` on `team_tasks` (filtered by `team_id`) |
| Team Files | `team-files-{teamId}` | INSERT/DELETE/UPDATE on `team_files` |

**Requirement for any new realtime table:** it must be added to the `supabase_realtime` publication via migration (see `team_chat_realtime`, `team_tasks_realtime` as examples) — subscribing client-side does nothing if the table isn't in the publication. Prefer `REPLICA IDENTITY FULL` when UPDATE/DELETE payloads need the full old row (see `wc26_matches` migration for precedent), otherwise default identity is fine for INSERT-heavy tables.

---

## 7. Third-party integrations

| Integration | Purpose | Auth method | Failure mode to design for |
|---|---|---|---|
| Google Drive API | Study material file storage/browsing | Public API key (read) + OAuth implicit flow (admin write) | API key quota exhaustion, folder ID misconfiguration (shows empty state, not crash) |
| Google Gemini (`gemini-2.5-flash`) | AI Assistant | `GEMINI_API_KEY` in Edge Function | Free-tier quota exhaustion — `gemini-2.0-flash` was rejected earlier for exactly this (`limit:0` on this project's key); monitor quota before assuming a model swap is safe |
| Brevo | Transactional + broadcast email | API key in Edge Function | Migrated from Resend — don't reintroduce Resend code paths |
| Web Push (VAPID) | Push notifications | VAPID keypair, subscription per browser in `push_subscriptions` | Stale/expired subscriptions should fail silently per-recipient, not abort a broadcast |
| Vercel | Hosting, analytics, speed insights | Project-linked | — |

---

## 8. Data & storage limits (as configured)

| Resource | Limit |
|---|---|
| `study-materials` bucket | 50 MB/file, public |
| `team-files` bucket | 20 MB/file, PDF/DOCX/XLSX/PNG/JPG/WebP only, public |
| `ai_chat_usage` | 30 messages/user/day (enforced server-side in `ai-chat`) |
| `team_messages.content` | 1–2000 chars (DB check constraint) |
| `team_tasks.title` | 1–150 chars |
| `feedback.message` | 3–4000 chars |
| `teams.max_members` | 2–7 (DB check constraint) |

Any new upload feature should set an explicit bucket size/type limit rather than relying on Supabase defaults — every existing bucket does.

---

## 9. Testing — current state (gap, not a standard to follow)

**There is no automated test suite in this repository today.** No Jest/Vitest/RTL config, no CI test step. Verification is currently manual (`/verify` skill, browser testing, Supabase `get_advisors`/`get_logs` for backend issues). This is a known gap tracked in `PLAN.md` → Quality, not an intentional "no tests needed" policy — treat it as debt, not precedent, when deciding whether a new feature needs coverage.

**What does exist for safety nets:**
- `RootErrorBoundary` in `main.tsx` — catches render crashes app-wide, shows stack trace instead of blank page.
- `eslint` + `typescript-eslint` — run via `npm run lint`, catches type/lint issues but not behavioral regressions.
- Supabase `get_advisors` — flags RLS/security misconfigurations post-migration (use it after every migration that touches RLS).

---

## 10. Deployment pipeline

1. Push to a branch (`main` or `full-version`) → Vercel auto-builds (`npm run build` → `vite build` → `dist/`).
2. Preview deployments generated per-branch/PR by default; production promotion tied to the branch → domain mapping (see `PLAN.md` → Domain & Hosting).
3. Supabase migrations are applied separately — **not** part of the Vercel build. Migrations in `supabase/migrations/` are the source of truth for schema history; apply via Supabase MCP `apply_migration` or `supabase db push`, matching what's committed, before or alongside a frontend deploy that depends on the new schema. A frontend deploy that assumes a column/table exists must not ship before the migration is applied to the target project.
4. Edge Functions deploy independently via `deploy_edge_function` / `supabase functions deploy` — not bundled into the Vite build.

**Two live Supabase projects implied by two branches** (`main` vs `full-version` pointing at `bubt.edu51portal.live`) — confirm which project a migration/Edge Function change targets before applying; the `study_drive_config` vs `study_department_config` split exists specifically because `main`'s data must not be touched by `full-version` schema work.

---

## 11. Known technical debt (carry-forward from PRD/PLAN)

- `sync-wc26-matches` Edge Function — dead, deployed, safe to delete.
- `materials`/`courses`/legacy tables — 0 rows, pre-Drive-integration leftovers.
- `study_folders`/`study_materials` (Supabase-hosted upload path) — built, 0 rows, unused; fate undecided (see `PLAN.md`).
- No automated tests (§9).
- `App.tsx` is a ~8600-line single file by design (hub-and-spoke state owner) — this is a known, accepted tradeoff, not a pending refactor; don't propose splitting it without buy-in, since it's the intentional single source of top-level app state.
- `any` types remain in places pending cleanup (tracked in `PLAN.md` → Quality).
