-- ============================================================================
-- Migration: Alumni Outreach & Concierge Invitations
-- Description: Supports admin prospect management, 72h re-invites, and token claiming
-- ============================================================================

create table if not exists public.alumni_invitations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  department text not null default 'CSE',
  passing_year integer,
  intake integer,
  company text,
  designation text,
  linkedin_url text,
  phone text,
  notes text,
  invite_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'new' check (status in ('new', 'invited', 'joined', 'already_registered', 'bounced')),
  invite_count integer not null default 0,
  first_invited_at timestamptz,
  last_invited_at timestamptz,
  joined_at timestamptz,
  claimed_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for rapid lookups and cooldown filtering
create index if not exists alumni_invitations_email_idx on public.alumni_invitations(lower(email));
create index if not exists alumni_invitations_token_idx on public.alumni_invitations(invite_token);
create index if not exists alumni_invitations_status_idx on public.alumni_invitations(status);
create index if not exists alumni_invitations_last_invited_idx on public.alumni_invitations(last_invited_at);

-- RLS: Enable row level security
alter table public.alumni_invitations enable row level security;

-- Admin full control
drop policy if exists "Admins have full access to alumni_invitations" on public.alumni_invitations;
create policy "Admins have full access to alumni_invitations"
  on public.alumni_invitations
  for all
  to authenticated
  using (public.is_app_admin());

-- Public read-only policy for active tokens during claiming
drop policy if exists "Public token verification" on public.alumni_invitations;
create policy "Public token verification"
  on public.alumni_invitations
  for select
  to anon, authenticated
  using (status in ('new', 'invited'));

-- Helper RPC to securely validate token and fetch prefill data
create or replace function public.get_alumni_invite_details(p_token text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invite record;
begin
  select * into v_invite
  from public.alumni_invitations
  where invite_token = p_token
  limit 1;

  if not found then
    return json_build_object('valid', false, 'reason', 'Token not found');
  end if;

  if v_invite.status = 'joined' then
    return json_build_object('valid', false, 'reason', 'Already claimed');
  end if;

  return json_build_object(
    'valid', true,
    'id', v_invite.id,
    'full_name', v_invite.full_name,
    'email', v_invite.email,
    'department', v_invite.department,
    'passing_year', v_invite.passing_year,
    'intake', v_invite.intake,
    'company', v_invite.company,
    'designation', v_invite.designation,
    'linkedin_url', v_invite.linkedin_url,
    'phone', v_invite.phone,
    'invite_count', v_invite.invite_count,
    'status', v_invite.status
  );
end;
$$;

-- Helper RPC to claim invite and auto-verify account atomically
create or replace function public.claim_alumni_invite(
  p_token text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invite record;
begin
  select * into v_invite
  from public.alumni_invitations
  where invite_token = p_token
  limit 1;

  if not found then
    raise exception 'Invalid invitation token';
  end if;

  if v_invite.status = 'joined' then
    raise exception 'Invitation already claimed';
  end if;

  -- 1. Mark invitation as joined
  update public.alumni_invitations
  set status = 'joined',
      joined_at = now(),
      claimed_user_id = p_user_id,
      updated_at = now()
  where id = v_invite.id;

  -- 2. Ensure profile has alumni and verified flags active
  update public.profiles
  set is_alumni = true,
      is_verified = true,
      department = coalesce(department, v_invite.department)
  where id = p_user_id;

  -- 3. Upsert alumni profile with verified status
  insert into public.alumni_profiles (
    id,
    full_name,
    email,
    dept,
    graduation_year,
    job_title,
    phone,
    is_verified,
    created_at,
    updated_at
  ) values (
    p_user_id,
    v_invite.full_name,
    v_invite.email,
    v_invite.department,
    v_invite.passing_year,
    coalesce(v_invite.designation, '') || case when v_invite.company is not null and v_invite.company != '' then ' at ' || v_invite.company else '' end,
    v_invite.phone,
    true,
    now(),
    now()
  )
  on conflict (id) do update
  set is_verified = true,
      dept = coalesce(public.alumni_profiles.dept, excluded.dept),
      graduation_year = coalesce(public.alumni_profiles.graduation_year, excluded.graduation_year),
      job_title = case when public.alumni_profiles.job_title is null or public.alumni_profiles.job_title = '' then excluded.job_title else public.alumni_profiles.job_title end,
      phone = coalesce(public.alumni_profiles.phone, excluded.phone),
      updated_at = now();

  return true;
end;
$$;
