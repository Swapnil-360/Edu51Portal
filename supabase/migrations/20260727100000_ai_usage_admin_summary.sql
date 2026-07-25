-- Admin-only aggregate of today's AI chat usage, so the admin panel can
-- show total requests against Gemini's free-tier daily project cap
-- without needing a broad SELECT policy on ai_chat_usage (which stays
-- locked to "own row only" for regular users).
create or replace function public.admin_get_ai_usage_today()
returns table (total_messages bigint, active_users bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select
      coalesce(sum(message_count), 0)::bigint as total_messages,
      count(*)::bigint as active_users
    from ai_chat_usage
    where usage_date = current_date;
end;
$$;

grant execute on function public.admin_get_ai_usage_today() to authenticated;
