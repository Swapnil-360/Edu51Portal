-- Remove World Cup 2026 feature: stop the per-minute score-sync cron job and
-- drop its now-unused table (the feature and all client code has been removed).
select cron.unschedule('sync-wc26-matches-every-minute');

drop table if exists public.wc26_matches;
