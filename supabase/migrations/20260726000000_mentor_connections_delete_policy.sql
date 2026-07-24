-- Allow connected student or alumni to delete mentorship connection
drop policy if exists "Users can delete mentorship connections" on public.mentor_connections;
create policy "Users can delete mentorship connections"
  on public.mentor_connections for delete
  using (auth.uid() = alumni_id or auth.uid() = student_id);
