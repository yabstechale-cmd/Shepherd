create table if not exists public.air_handler_schedules (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  created_by_id uuid references public.profiles(id) on delete set null,
  handler_number integer not null check (handler_number between 1 and 3),
  row_order integer not null default 0,
  active_days text[] not null default '{}',
  hours text not null default '',
  created_at timestamptz not null default now()
);

alter table public.air_handler_schedules add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.air_handler_schedules add column if not exists created_by_id uuid references public.profiles(id) on delete set null;
alter table public.air_handler_schedules add column if not exists handler_number integer;
alter table public.air_handler_schedules add column if not exists row_order integer not null default 0;
alter table public.air_handler_schedules add column if not exists active_days text[] not null default '{}';
alter table public.air_handler_schedules add column if not exists hours text not null default '';
alter table public.air_handler_schedules add column if not exists created_at timestamptz not null default now();

create index if not exists air_handler_schedules_church_handler_idx
  on public.air_handler_schedules (church_id, handler_number, row_order);

alter table public.air_handler_schedules
  enable row level security;

drop policy if exists "air handler schedules same church read" on public.air_handler_schedules;
create policy "air handler schedules same church read"
on public.air_handler_schedules
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = air_handler_schedules.church_id
  )
);

drop policy if exists "air handler schedules same church insert" on public.air_handler_schedules;
create policy "air handler schedules same church insert"
on public.air_handler_schedules
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = air_handler_schedules.church_id
      and p.id = air_handler_schedules.created_by_id
  )
);

drop policy if exists "air handler schedules same church update" on public.air_handler_schedules;
create policy "air handler schedules same church update"
on public.air_handler_schedules
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = air_handler_schedules.church_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = air_handler_schedules.church_id
  )
);

drop policy if exists "air handler schedules same church delete" on public.air_handler_schedules;
create policy "air handler schedules same church delete"
on public.air_handler_schedules
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = air_handler_schedules.church_id
  )
);
