alter table public.churches
  add column if not exists google_calendar_last_synced_at timestamptz,
  add column if not exists google_calendar_last_sync_error text;
