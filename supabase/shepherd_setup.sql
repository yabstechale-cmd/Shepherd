create extension if not exists pgcrypto;

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  created_at timestamptz not null default now()
);

alter table public.churches add column if not exists name text;
alter table public.churches add column if not exists code text;
alter table public.churches add column if not exists created_at timestamptz not null default now();

create unique index if not exists churches_code_key on public.churches (code);

alter table public.churches
  enable row level security;

create table if not exists public.church_staff (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  role text not null,
  title text not null,
  email text,
  ministries text[] not null default '{}',
  can_see_team_overview boolean not null default true,
  can_see_admin_overview boolean not null default false,
  read_only_oversight boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.church_staff add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.church_staff add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.church_staff add column if not exists full_name text;
alter table public.church_staff add column if not exists role text;
alter table public.church_staff add column if not exists title text;
alter table public.church_staff add column if not exists email text;
alter table public.church_staff add column if not exists ministries text[] not null default '{}';
alter table public.church_staff add column if not exists can_see_team_overview boolean not null default true;
alter table public.church_staff add column if not exists can_see_admin_overview boolean not null default false;
alter table public.church_staff add column if not exists read_only_oversight boolean not null default false;
alter table public.church_staff add column if not exists created_at timestamptz not null default now();

create unique index if not exists church_staff_church_name_key on public.church_staff (church_id, full_name);
create unique index if not exists church_staff_auth_user_id_key on public.church_staff (auth_user_id) where auth_user_id is not null;

alter table public.church_staff
  enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  staff_id uuid unique references public.church_staff(id) on delete set null,
  full_name text not null,
  role text not null,
  title text,
  email text,
  ministries text[] not null default '{}',
  can_see_team_overview boolean not null default true,
  can_see_admin_overview boolean not null default false,
  read_only_oversight boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.profiles add column if not exists staff_id uuid references public.church_staff(id) on delete set null;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists ministries text[] not null default '{}';
alter table public.profiles add column if not exists can_see_team_overview boolean not null default true;
alter table public.profiles add column if not exists can_see_admin_overview boolean not null default false;
alter table public.profiles add column if not exists read_only_oversight boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create unique index if not exists profiles_staff_id_key on public.profiles (staff_id) where staff_id is not null;

alter table public.profiles
  enable row level security;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null,
  ministry text not null,
  assignee text not null,
  due_date date,
  status text not null default 'todo',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tasks add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.tasks add column if not exists title text;
alter table public.tasks add column if not exists ministry text;
alter table public.tasks add column if not exists assignee text;
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists status text not null default 'todo';
alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists created_at timestamptz not null default now();

alter table public.tasks
  enable row level security;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  full_name text not null,
  role text,
  ministry text,
  email text,
  phone text,
  tier text default 'volunteer',
  status text default 'active',
  prayer_request text,
  last_contact date,
  created_at timestamptz not null default now()
);

alter table public.people add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.people add column if not exists full_name text;
alter table public.people add column if not exists role text;
alter table public.people add column if not exists ministry text;
alter table public.people add column if not exists email text;
alter table public.people add column if not exists phone text;
alter table public.people add column if not exists tier text default 'volunteer';
alter table public.people add column if not exists status text default 'active';
alter table public.people add column if not exists prayer_request text;
alter table public.people add column if not exists last_contact date;
alter table public.people add column if not exists created_at timestamptz not null default now();

alter table public.people
  enable row level security;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  description text not null,
  amount numeric not null,
  ministry text not null,
  category text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.transactions add column if not exists description text;
alter table public.transactions add column if not exists amount numeric;
alter table public.transactions add column if not exists ministry text;
alter table public.transactions add column if not exists category text;
alter table public.transactions add column if not exists date date not null default current_date;
alter table public.transactions add column if not exists created_at timestamptz not null default now();

alter table public.transactions
  enable row level security;

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  color text,
  budget numeric not null default 0,
  spent numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ministries add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.ministries add column if not exists name text;
alter table public.ministries add column if not exists color text;
alter table public.ministries add column if not exists budget numeric not null default 0;
alter table public.ministries add column if not exists spent numeric not null default 0;
alter table public.ministries add column if not exists created_at timestamptz not null default now();

create unique index if not exists ministries_church_name_key on public.ministries (church_id, name);

alter table public.ministries
  enable row level security;

drop policy if exists "church code lookup" on public.churches;
create policy "church code lookup"
on public.churches
for select
using (true);

drop policy if exists "church staff lookup" on public.church_staff;
create policy "church staff lookup"
on public.church_staff
for select
using (true);

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self write"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "tasks same church read" on public.tasks;
create policy "tasks same church read"
on public.tasks
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = tasks.church_id
  )
);

drop policy if exists "tasks same church write" on public.tasks;
create policy "tasks same church write"
on public.tasks
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = tasks.church_id
      and (
        p.can_see_admin_overview
        or p.role = 'senior_pastor'
        or tasks.assignee = p.full_name
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = tasks.church_id
      and (
        p.can_see_admin_overview
        or p.role = 'senior_pastor'
        or assignee = p.full_name
      )
  )
);

drop policy if exists "people same church read" on public.people;
create policy "people same church read"
on public.people
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = people.church_id
  )
);

drop policy if exists "people admin write" on public.people;
create policy "people admin write"
on public.people
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = people.church_id
      and (p.can_see_admin_overview or p.role = 'senior_pastor')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = people.church_id
      and (p.can_see_admin_overview or p.role = 'senior_pastor')
  )
);

drop policy if exists "transactions same church read" on public.transactions;
create policy "transactions same church read"
on public.transactions
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = transactions.church_id
  )
);

drop policy if exists "transactions finance write" on public.transactions;
create policy "transactions finance write"
on public.transactions
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = transactions.church_id
      and (
        p.can_see_admin_overview
        or p.role = 'senior_pastor'
        or p.full_name = 'Joel'
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = transactions.church_id
      and (
        p.can_see_admin_overview
        or p.role = 'senior_pastor'
        or p.full_name = 'Joel'
      )
  )
);

drop policy if exists "ministries same church read" on public.ministries;
create policy "ministries same church read"
on public.ministries
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = ministries.church_id
  )
);

drop policy if exists "ministries admin write" on public.ministries;
create policy "ministries admin write"
on public.ministries
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = ministries.church_id
      and (p.can_see_admin_overview or p.role = 'senior_pastor')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = ministries.church_id
      and (p.can_see_admin_overview or p.role = 'senior_pastor')
  )
);

insert into public.churches (id, name, code)
values ('11111111-1111-1111-1111-111111111111', 'Reach Church', '0712')
on conflict (code) do update
set name = excluded.name;

insert into public.church_staff (
  church_id,
  full_name,
  role,
  title,
  ministries,
  can_see_team_overview,
  can_see_admin_overview,
  read_only_oversight
)
values
  ('11111111-1111-1111-1111-111111111111', 'Eric Souza', 'senior_pastor', 'Senior Pastor', array['Services','Operations'], true, true, false),
  ('11111111-1111-1111-1111-111111111111', 'Will Potts', 'worship_pastor', 'Worship Pastor', array['Worship','Services'], true, false, false),
  ('11111111-1111-1111-1111-111111111111', 'Joel', 'associate_pastor', 'Associate Pastor, Missions & Finance', array['Missions','Finances','Operations'], true, false, false),
  ('11111111-1111-1111-1111-111111111111', 'Shannan', 'admin', 'Church Administrator', array['Admin','Operations'], true, true, false),
  ('11111111-1111-1111-1111-111111111111', 'Yabs', 'youth_creative', 'Youth & Art / Design', array['Youth','Young Adults','Events'], true, false, true)
on conflict (church_id, full_name) do update
set
  role = excluded.role,
  title = excluded.title,
  ministries = excluded.ministries,
  can_see_team_overview = excluded.can_see_team_overview,
  can_see_admin_overview = excluded.can_see_admin_overview,
  read_only_oversight = excluded.read_only_oversight;

insert into public.ministries (church_id, name, color, budget, spent)
values
  ('11111111-1111-1111-1111-111111111111', 'Worship', '#9b72e8', 12000, 0),
  ('11111111-1111-1111-1111-111111111111', 'Youth', '#52c87a', 9000, 0),
  ('11111111-1111-1111-1111-111111111111', 'Admin', '#5b8fe8', 6000, 0),
  ('11111111-1111-1111-1111-111111111111', 'Services', '#c9a84c', 8000, 0),
  ('11111111-1111-1111-1111-111111111111', 'Missions', '#52c87a', 7000, 0),
  ('11111111-1111-1111-1111-111111111111', 'Operations', '#9aa3b2', 4000, 0)
on conflict (church_id, name) do update
set
  color = excluded.color,
  budget = excluded.budget;
