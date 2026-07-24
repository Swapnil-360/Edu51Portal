-- Enable SELECT for users involved in the mentorship connection
drop policy if exists "Users can select mentorship connections" on public.mentor_connections;

create policy "Users can select mentorship connections"
  on public.mentor_connections for select
  using (auth.uid() = student_id or auth.uid() = alumni_id);
