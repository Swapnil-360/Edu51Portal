-- Alumni profile expansion: skills, achievements, portfolio link, social links,
-- and a configurable mentorship contact mode (website chat / social links / both).

alter table public.alumni_profiles add column skills text[] not null default '{}';
alter table public.alumni_profiles add column achievements text[] not null default '{}';
alter table public.alumni_profiles add column portfolio_url text;
alter table public.alumni_profiles add column social_links jsonb not null default '{}'::jsonb;
alter table public.alumni_profiles add column contact_mode text not null default 'website'
  check (contact_mode in ('website', 'social', 'both'));

create index alumni_profiles_skills_gin_idx on public.alumni_profiles using gin (skills);

-- RLS hardening: drop leftover permissive duplicate policies that neutralized the
-- owner-scoped INSERT/UPDATE policies (Postgres OR's permissive policies together,
-- so "with_check: true" / "qual: true" here let ANY authenticated caller write or
-- read any row, regardless of the stricter policies also present on this table).
drop policy if exists "Users can insert own profile" on public.alumni_profiles;
drop policy if exists "Users can update own profile" on public.alumni_profiles;
drop policy if exists "Anyone can view verified alumni" on public.alumni_profiles;
