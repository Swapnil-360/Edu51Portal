-- Departments go live when an admin explicitly flips this, separate from
-- just having a Drive folder configured (a link can be staged before launch).
alter table public.study_department_config
  add column active boolean not null default false;

-- CSE is already publicly active in production; carry that forward so this
-- migration doesn't silently take it offline.
update public.study_department_config
  set active = true
  where department = 'CSE';
