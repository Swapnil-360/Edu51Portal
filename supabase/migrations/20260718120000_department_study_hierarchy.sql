-- Department -> Semester -> Course -> Mid/Final study materials hierarchy (full-version).
-- study_drive_config stays as-is for the legacy major-based flow (still used on main);
-- this is a separate table since a department root folder contains semester folders,
-- not courses directly, unlike a major's root folder.

create table public.study_department_config (
  id uuid primary key default gen_random_uuid(),
  department text not null unique,
  folder_id text not null,
  label text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.study_department_config enable row level security;

create policy sdc2_select on public.study_department_config
  for select using (true);
create policy sdc2_upsert on public.study_department_config
  for insert with check (is_app_admin());
create policy sdc2_update on public.study_department_config
  for update using (is_app_admin());

-- Additive column: `main` never reads this, so production behavior is unaffected.
alter table public.profiles add column department text;

-- Move existing users to CSE so they keep access under the new department-based flow.
update public.profiles
  set department = 'CSE'
  where department is null;
