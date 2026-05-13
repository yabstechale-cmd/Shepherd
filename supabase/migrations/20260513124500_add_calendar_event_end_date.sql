alter table public.calendar_events
  add column if not exists end_date date;
