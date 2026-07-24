-- Allow authenticated users to view profiles
drop policy if exists "Alumni can view student profiles" on public.profiles;
create policy "Alumni can view student profiles"
  on public.profiles for select
  using (true);
