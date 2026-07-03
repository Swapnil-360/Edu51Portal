-- Enable extensions needed for server-side scheduled sync
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every minute, invoke the sync-wc26-matches edge function so scores refresh
-- centrally on the server instead of relying on any client having the tab open.
select cron.schedule(
  'sync-wc26-matches-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://aljnyhxthmwgesnkqwzu.supabase.co/functions/v1/sync-wc26-matches',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);

-- Let clients subscribe to live row changes instead of polling the edge function.
alter table public.wc26_matches replica identity full;
alter publication supabase_realtime add table public.wc26_matches;
