alter table public.calendar_events add column if not exists linked_event_request_id uuid references public.event_requests(id) on delete set null;
alter table public.calendar_events add column if not exists sync_to_google boolean not null default false;
alter table public.calendar_events add column if not exists google_last_synced_at timestamptz;
alter table public.calendar_events add column if not exists updated_at timestamptz not null default now();

create unique index if not exists calendar_events_google_source_key
  on public.calendar_events (church_id, google_calendar_source_id, google_calendar_source_event_id)
  where google_calendar_source_event_id is not null;

drop policy if exists "calendar events creator update" on public.calendar_events;
create policy "calendar events creator update"
on public.calendar_events
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = calendar_events.church_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = calendar_events.church_id
  )
);

drop policy if exists "calendar events creator delete" on public.calendar_events;
create policy "calendar events creator delete"
on public.calendar_events
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = calendar_events.church_id
  )
);
