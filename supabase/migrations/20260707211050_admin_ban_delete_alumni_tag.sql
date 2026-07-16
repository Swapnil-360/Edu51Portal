-- ── Ban support on profiles ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

-- ── Audit log for admin actions (ban/unban/delete/promote/demote) ──────────
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.admin_actions enable row level security;

create policy "admin_actions_select" on public.admin_actions
  for select to authenticated using (public.is_app_admin());

-- ── is_app_banned(): mirrors is_app_admin(), used inside RLS policies ──────
create or replace function public.is_app_banned()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_banned = true);
$$;

-- ── admin_set_user_banned(): ban/unban + audit log, owner-protected ────────
create or replace function public.admin_set_user_banned(target uuid, banned boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_app_admin() then raise exception 'not authorized'; end if;
  if exists (select 1 from public.profiles where id = target and is_owner = true) then
    raise exception 'cannot ban the owner account';
  end if;
  update public.profiles
    set is_banned = banned,
        banned_at = case when banned then now() else null end,
        ban_reason = case when banned then reason else null end
    where id = target;
  insert into public.admin_actions (admin_id, target_user_id, action, reason)
    values (auth.uid(), target, case when banned then 'ban' else 'unban' end, reason);
end;
$$;

-- ── admin_list_users(): extend with alumni/verified/banned flags ───────────
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table(id uuid, name text, bubt_email text, is_admin boolean, is_owner boolean, is_alumni boolean, is_verified boolean, is_banned boolean)
language sql
security definer
set search_path to 'public'
as $$
  select id, name, bubt_email, is_admin, is_owner, is_alumni, is_verified, is_banned from public.profiles
  where public.is_app_admin() order by is_owner desc, is_admin desc, name;
$$;

-- ── RLS: block banned users from writing to social/collab tables ───────────
-- (reads stay open everywhere, including study_materials/study_folders)
drop policy if exists "conn_insert" on public.connections;
create policy "conn_insert" on public.connections
  for insert to public
  with check (requester_id = auth.uid() and not public.is_app_banned());

drop policy if exists "inv_insert" on public.team_invitations;
create policy "inv_insert" on public.team_invitations
  for insert to public
  with check (inviter_id = auth.uid() and team_role(team_id, auth.uid()) = any (array['owner','admin']) and not public.is_app_banned());

drop policy if exists "jr_insert" on public.team_join_requests;
create policy "jr_insert" on public.team_join_requests
  for insert to public
  with check (user_id = auth.uid() and not public.is_app_banned());

drop policy if exists "react_insert" on public.team_message_reactions;
create policy "react_insert" on public.team_message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_app_banned()
    and exists (
      select 1 from team_messages m join team_members tm on tm.team_id = m.team_id
      where m.id = team_message_reactions.message_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "chat_insert" on public.team_messages;
create policy "chat_insert" on public.team_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_app_banned()
    and exists (
      select 1 from team_members
      where team_members.team_id = team_messages.team_id and team_members.user_id = auth.uid()
    )
  );
