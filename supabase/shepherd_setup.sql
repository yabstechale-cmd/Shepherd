create extension if not exists pgcrypto;

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  account_admin_user_id uuid references auth.users(id) on delete set null,
  account_admin_email text,
  created_at timestamptz not null default now()
);

alter table public.churches add column if not exists name text;
alter table public.churches add column if not exists code text;
alter table public.churches add column if not exists account_admin_user_id uuid references auth.users(id) on delete set null;
alter table public.churches add column if not exists account_admin_email text;
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
  staff_roles text[] not null default '{}',
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
alter table public.church_staff add column if not exists staff_roles text[] not null default '{}';
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
  staff_roles text[] not null default '{}',
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
alter table public.profiles add column if not exists staff_roles text[] not null default '{}';
alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists ministries text[] not null default '{}';
alter table public.profiles add column if not exists can_see_team_overview boolean not null default true;
alter table public.profiles add column if not exists can_see_admin_overview boolean not null default false;
alter table public.profiles add column if not exists read_only_oversight boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_role_check;

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
  review_required boolean not null default false,
  reviewers text[] not null default '{}',
  review_approvals text[] not null default '{}',
  review_history jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tasks add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.tasks add column if not exists title text;
alter table public.tasks add column if not exists ministry text;
alter table public.tasks add column if not exists assignee text;
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists status text not null default 'todo';
alter table public.tasks add column if not exists review_required boolean not null default false;
alter table public.tasks add column if not exists reviewers text[] not null default '{}';
alter table public.tasks add column if not exists review_approvals text[] not null default '{}';
alter table public.tasks add column if not exists review_history jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists created_at timestamptz not null default now();

alter table public.tasks
  enable row level security;

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'draft',
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  approval_required boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.automations add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.automations add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.automations add column if not exists name text;
alter table public.automations add column if not exists description text;
alter table public.automations add column if not exists status text not null default 'draft';
alter table public.automations add column if not exists trigger_type text;
alter table public.automations add column if not exists trigger_config jsonb not null default '{}'::jsonb;
alter table public.automations add column if not exists action_config jsonb not null default '{}'::jsonb;
alter table public.automations add column if not exists approval_required boolean not null default true;
alter table public.automations add column if not exists last_run_at timestamptz;
alter table public.automations add column if not exists created_at timestamptz not null default now();

alter table public.automations
  enable row level security;

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  status text not null default 'pending',
  run_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.automation_runs add column if not exists automation_id uuid references public.automations(id) on delete cascade;
alter table public.automation_runs add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.automation_runs add column if not exists status text not null default 'pending';
alter table public.automation_runs add column if not exists run_summary text;
alter table public.automation_runs add column if not exists started_at timestamptz not null default now();
alter table public.automation_runs add column if not exists finished_at timestamptz;

alter table public.automation_runs
  enable row level security;

create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  status text not null default 'new',
  decided_at timestamptz,
  decided_by text,
  requested_by text,
  event_name text not null,
  event_format text not null,
  event_timing text not null,
  single_date date,
  single_start_time text,
  single_end_time text,
  multi_start_date date,
  multi_end_date date,
  multi_start_time text,
  multi_end_time text,
  recurring_start_date date,
  recurring_start_time text,
  recurring_end_time text,
  recurring_frequency text,
  setup_datetime timestamptz,
  description text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  location_scope text not null,
  location_areas text[] not null default '{}',
  graphics_reference text,
  av_request boolean not null default false,
  av_request_details text,
  tables_needed text,
  tables_6ft_rectangular integer not null default 0,
  tables_8ft_rectangular integer not null default 0,
  tables_5ft_round integer not null default 0,
  black_vinyl_tablecloths text,
  white_linen_tablecloths text,
  white_linen_agreement boolean not null default false,
  pipe_and_drape text,
  metal_folding_chairs_requested boolean not null default false,
  metal_folding_chairs integer,
  sanctuary_chairs text,
  kitchen_use boolean not null default false,
  drip_coffee_only boolean not null default false,
  espresso_drinks boolean not null default false,
  additional_information text,
  graphics_task_created boolean not null default false,
  graphics_task_id uuid references public.tasks(id) on delete set null,
  submitted_on date not null default current_date,
  signature text not null,
  created_at timestamptz not null default now()
);

alter table public.event_requests add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.event_requests add column if not exists status text not null default 'new';
alter table public.event_requests add column if not exists decided_at timestamptz;
alter table public.event_requests add column if not exists decided_by text;
alter table public.event_requests add column if not exists requested_by text;
alter table public.event_requests add column if not exists event_name text;
alter table public.event_requests add column if not exists event_format text;
alter table public.event_requests add column if not exists event_timing text;
alter table public.event_requests add column if not exists single_date date;
alter table public.event_requests add column if not exists single_start_time text;
alter table public.event_requests add column if not exists single_end_time text;
alter table public.event_requests add column if not exists multi_start_date date;
alter table public.event_requests add column if not exists multi_end_date date;
alter table public.event_requests add column if not exists multi_start_time text;
alter table public.event_requests add column if not exists multi_end_time text;
alter table public.event_requests add column if not exists recurring_start_date date;
alter table public.event_requests add column if not exists recurring_start_time text;
alter table public.event_requests add column if not exists recurring_end_time text;
alter table public.event_requests add column if not exists recurring_frequency text;
alter table public.event_requests add column if not exists setup_datetime timestamptz;
alter table public.event_requests add column if not exists description text;
alter table public.event_requests add column if not exists contact_name text;
alter table public.event_requests add column if not exists phone text;
alter table public.event_requests add column if not exists email text;
alter table public.event_requests add column if not exists location_scope text;
alter table public.event_requests add column if not exists location_areas text[] not null default '{}';
alter table public.event_requests add column if not exists graphics_reference text;
alter table public.event_requests add column if not exists av_request boolean not null default false;
alter table public.event_requests add column if not exists av_request_details text;
alter table public.event_requests add column if not exists tables_needed text;
alter table public.event_requests add column if not exists tables_6ft_rectangular integer not null default 0;
alter table public.event_requests add column if not exists tables_8ft_rectangular integer not null default 0;
alter table public.event_requests add column if not exists tables_5ft_round integer not null default 0;
alter table public.event_requests add column if not exists black_vinyl_tablecloths text;
alter table public.event_requests add column if not exists white_linen_tablecloths text;
alter table public.event_requests add column if not exists white_linen_agreement boolean not null default false;
alter table public.event_requests add column if not exists pipe_and_drape text;
alter table public.event_requests add column if not exists metal_folding_chairs_requested boolean not null default false;
alter table public.event_requests add column if not exists metal_folding_chairs integer;
alter table public.event_requests add column if not exists sanctuary_chairs text;
alter table public.event_requests add column if not exists kitchen_use boolean not null default false;
alter table public.event_requests add column if not exists drip_coffee_only boolean not null default false;
alter table public.event_requests add column if not exists espresso_drinks boolean not null default false;
alter table public.event_requests add column if not exists additional_information text;
alter table public.event_requests add column if not exists graphics_task_created boolean not null default false;
alter table public.event_requests add column if not exists graphics_task_id uuid references public.tasks(id) on delete set null;
alter table public.event_requests add column if not exists submitted_on date not null default current_date;
alter table public.event_requests add column if not exists signature text;
alter table public.event_requests add column if not exists created_at timestamptz not null default now();

alter table public.event_requests
  enable row level security;

create table if not exists public.event_workflows (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  linked_event_request_id uuid references public.event_requests(id) on delete set null,
  title text not null,
  event_name text,
  owner_name text not null,
  visibility text not null default 'private',
  start_date date,
  end_date date,
  location text,
  main_contact text,
  timeline_items jsonb not null default '[]'::jsonb,
  checklist_items jsonb not null default '[]'::jsonb,
  notes_entries jsonb not null default '[]'::jsonb,
  summary text,
  target_date date,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.event_workflows add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.event_workflows add column if not exists linked_event_request_id uuid references public.event_requests(id) on delete set null;
alter table public.event_workflows add column if not exists title text;
alter table public.event_workflows add column if not exists event_name text;
alter table public.event_workflows add column if not exists owner_name text;
alter table public.event_workflows add column if not exists visibility text not null default 'private';
alter table public.event_workflows add column if not exists start_date date;
alter table public.event_workflows add column if not exists end_date date;
alter table public.event_workflows add column if not exists location text;
alter table public.event_workflows add column if not exists main_contact text;
alter table public.event_workflows add column if not exists timeline_items jsonb not null default '[]'::jsonb;
alter table public.event_workflows add column if not exists checklist_items jsonb not null default '[]'::jsonb;
alter table public.event_workflows add column if not exists notes_entries jsonb not null default '[]'::jsonb;
alter table public.event_workflows add column if not exists summary text;
alter table public.event_workflows add column if not exists target_date date;
alter table public.event_workflows add column if not exists steps jsonb not null default '[]'::jsonb;
alter table public.event_workflows add column if not exists created_at timestamptz not null default now();

alter table public.event_workflows
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

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  requested_by text not null,
  requester_email text,
  ministry text not null,
  budget_line_item text not null,
  title text not null,
  amount numeric not null,
  needed_by date,
  purchase_link text,
  included_in_budget boolean not null default true,
  notes text,
  status text not null default 'pending',
  required_approvers text[] not null default '{}',
  approvals text[] not null default '{}',
  comments jsonb not null default '[]'::jsonb,
  approval_history jsonb not null default '[]'::jsonb,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);

alter table public.purchase_orders add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.purchase_orders add column if not exists requester_id uuid references public.profiles(id) on delete set null;
alter table public.purchase_orders add column if not exists requested_by text;
alter table public.purchase_orders add column if not exists requester_email text;
alter table public.purchase_orders add column if not exists ministry text;
alter table public.purchase_orders add column if not exists budget_line_item text;
alter table public.purchase_orders add column if not exists title text;
alter table public.purchase_orders add column if not exists amount numeric;
alter table public.purchase_orders add column if not exists needed_by date;
alter table public.purchase_orders add column if not exists purchase_link text;
alter table public.purchase_orders add column if not exists included_in_budget boolean not null default true;
alter table public.purchase_orders add column if not exists notes text;
alter table public.purchase_orders add column if not exists status text not null default 'pending';
alter table public.purchase_orders add column if not exists required_approvers text[] not null default '{}';
alter table public.purchase_orders add column if not exists approvals text[] not null default '{}';
alter table public.purchase_orders add column if not exists comments jsonb not null default '[]'::jsonb;
alter table public.purchase_orders add column if not exists approval_history jsonb not null default '[]'::jsonb;
alter table public.purchase_orders add column if not exists decided_at timestamptz;
alter table public.purchase_orders add column if not exists decided_by text;
alter table public.purchase_orders add column if not exists created_at timestamptz not null default now();

alter table public.purchase_orders
  enable row level security;

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  color text,
  budget numeric not null default 0,
  spent numeric not null default 0,
  budget_categories text[] not null default '{}',
  budget_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ministries add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.ministries add column if not exists name text;
alter table public.ministries add column if not exists color text;
alter table public.ministries add column if not exists budget numeric not null default 0;
alter table public.ministries add column if not exists spent numeric not null default 0;
alter table public.ministries add column if not exists budget_categories text[] not null default '{}';
alter table public.ministries add column if not exists budget_items jsonb not null default '[]'::jsonb;
alter table public.ministries add column if not exists created_at timestamptz not null default now();

create unique index if not exists ministries_church_name_key on public.ministries (church_id, name);

alter table public.ministries
  enable row level security;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.reserve_staff_registration(
  p_staff_id uuid,
  p_church_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_staff_id is null or p_church_id is null or p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Missing registration details.';
  end if;

  if exists (
    select 1
    from public.church_staff
    where church_id = p_church_id
      and lower(coalesce(email, '')) = lower(trim(p_email))
      and id <> p_staff_id
  ) then
    raise exception 'That email is already reserved for another staff account.';
  end if;

  update public.church_staff
  set email = trim(p_email)
  where id = p_staff_id
    and church_id = p_church_id
    and auth_user_id is null
    and (email is null or lower(email) = lower(trim(p_email)));

  if not found then
    raise exception 'That staff account is already claimed or unavailable.';
  end if;
end;
$$;

create or replace function public.create_church_with_admin(
  p_church_name text,
  p_code text,
  p_admin_name text,
  p_admin_role text,
  p_admin_title text,
  p_email text,
  p_user_id uuid
)
returns table (
  church_id uuid,
  staff_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_church_id uuid;
  created_staff_id uuid;
begin
  if p_user_id is null then
    raise exception 'Missing administrator account.';
  end if;

  if p_church_name is null or length(trim(p_church_name)) = 0 then
    raise exception 'Church name is required.';
  end if;

  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'Church code must be at least 4 characters.';
  end if;

  if p_admin_name is null or length(trim(p_admin_name)) = 0 then
    raise exception 'Administrator name is required.';
  end if;

  if exists (
    select 1
    from public.churches
    where lower(code) = lower(trim(p_code))
  ) then
    raise exception 'That church code is already in use.';
  end if;

  insert into public.churches (name, code, account_admin_user_id, account_admin_email)
  values (trim(p_church_name), trim(p_code), p_user_id, lower(trim(p_email)))
  returning id into created_church_id;

  insert into public.church_staff (
    church_id,
    auth_user_id,
    full_name,
    role,
    staff_roles,
    title,
    email,
    ministries,
    can_see_team_overview,
    can_see_admin_overview,
    read_only_oversight
  )
  values (
    created_church_id,
    p_user_id,
    trim(p_admin_name),
    coalesce(nullif(trim(p_admin_role), ''), 'church_administrator'),
    array[coalesce(nullif(trim(p_admin_role), ''), 'church_administrator')],
    coalesce(nullif(trim(p_admin_title), ''), 'Church Administrator'),
    lower(trim(p_email)),
    array['Admin','Operations'],
    true,
    true,
    false
  )
  returning id into created_staff_id;

  insert into public.profiles (
    id,
    church_id,
    staff_id,
    full_name,
    role,
    staff_roles,
    title,
    email,
    ministries,
    can_see_team_overview,
    can_see_admin_overview,
    read_only_oversight
  )
  values (
    p_user_id,
    created_church_id,
    created_staff_id,
    trim(p_admin_name),
    coalesce(nullif(trim(p_admin_role), ''), 'church_administrator'),
    array[coalesce(nullif(trim(p_admin_role), ''), 'church_administrator')],
    coalesce(nullif(trim(p_admin_title), ''), 'Church Administrator'),
    lower(trim(p_email)),
    array['Admin','Operations'],
    true,
    true,
    false
  )
  on conflict (id) do update
  set
    church_id = excluded.church_id,
    staff_id = excluded.staff_id,
    full_name = excluded.full_name,
    role = excluded.role,
    staff_roles = excluded.staff_roles,
    title = excluded.title,
    email = excluded.email,
    ministries = excluded.ministries,
    can_see_team_overview = excluded.can_see_team_overview,
    can_see_admin_overview = excluded.can_see_admin_overview,
    read_only_oversight = excluded.read_only_oversight;

  return query
  select created_church_id, created_staff_id;
end;
$$;

create or replace function public.claim_staff_profile(
  p_staff_id uuid,
  p_church_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  staff_row public.church_staff%rowtype;
  profile_row public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to claim this account.';
  end if;

  if p_staff_id is null or p_church_id is null then
    raise exception 'Missing staff claim details.';
  end if;

  select *
  into staff_row
  from public.church_staff
  where id = p_staff_id
    and church_id = p_church_id
    and (email is null or lower(email) = current_email)
    and (auth_user_id is null or auth_user_id = current_user_id);

  if not found then
    raise exception 'We could not match this account to that staff profile.';
  end if;

  update public.church_staff
  set auth_user_id = current_user_id,
      email = current_email
  where id = staff_row.id;

  insert into public.profiles (
    id,
    church_id,
    staff_id,
    full_name,
    role,
    staff_roles,
    title,
    email,
    ministries,
    can_see_team_overview,
    can_see_admin_overview,
    read_only_oversight
  )
  values (
    current_user_id,
    staff_row.church_id,
    staff_row.id,
    staff_row.full_name,
    staff_row.role,
    coalesce(staff_row.staff_roles, array[staff_row.role]),
    staff_row.title,
    current_email,
    coalesce(staff_row.ministries, '{}'::text[]),
    staff_row.can_see_team_overview,
    staff_row.can_see_admin_overview,
    staff_row.read_only_oversight
  )
  on conflict (id) do update
  set
    church_id = excluded.church_id,
    staff_id = excluded.staff_id,
    full_name = excluded.full_name,
    role = excluded.role,
    staff_roles = excluded.staff_roles,
    title = excluded.title,
    email = excluded.email,
    ministries = excluded.ministries,
    can_see_team_overview = excluded.can_see_team_overview,
    can_see_admin_overview = excluded.can_see_admin_overview,
    read_only_oversight = excluded.read_only_oversight
  returning * into profile_row;

  return profile_row;
end;
$$;

create or replace function public.user_can_manage_church(
  p_church_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  can_manage boolean := false;
begin
  select exists (
    select 1
    from public.profiles p
    left join public.churches c on c.id = p.church_id
    where p.id = auth.uid()
      and p.church_id = p_church_id
      and (
        p.can_see_admin_overview
        or p.role in ('church_administrator', 'admin', 'senior_pastor')
        or c.account_admin_user_id = p.id
        or (
          c.account_admin_email is not null
          and lower(c.account_admin_email) = lower(coalesce(p.email, ''))
        )
      )
  )
  into can_manage;

  return coalesce(can_manage, false);
end;
$$;

create or replace function public.delete_church_account(
  p_church_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_profile public.profiles%rowtype;
  delete_user_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to delete a church account.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid()
    and church_id = p_church_id;

  if not found then
    raise exception 'You do not have access to that church account.';
  end if;

  if current_profile.role not in ('church_administrator', 'admin', 'senior_pastor') then
    raise exception 'Only the Church Administrator or Senior Pastor can delete this church account.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
  into delete_user_ids
  from auth.users
  where id in (
    select p.id
    from public.profiles p
    where p.church_id = p_church_id
  );

  delete from public.churches
  where id = p_church_id;

  if array_length(delete_user_ids, 1) is not null then
    delete from auth.users
    where id = any(delete_user_ids);
  end if;
end;
$$;

grant execute on function public.reserve_staff_registration(uuid, uuid, text) to anon, authenticated;
grant execute on function public.claim_staff_profile(uuid, uuid) to authenticated;
grant execute on function public.create_church_with_admin(text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.user_can_manage_church(uuid) to authenticated;
grant execute on function public.delete_church_account(uuid) to authenticated;

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

drop policy if exists "church staff admin write" on public.church_staff;
create policy "church staff admin write"
on public.church_staff
for all
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

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

drop policy if exists "profiles church admin write" on public.profiles;
create policy "profiles church admin write"
on public.profiles
for all
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

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
        public.user_can_manage_church(tasks.church_id)
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
        public.user_can_manage_church(tasks.church_id)
        or assignee = p.full_name
      )
  )
);

drop policy if exists "event requests public submit" on public.event_requests;
create policy "event requests public submit"
on public.event_requests
for insert
with check (
  exists (
    select 1
    from public.churches c
    where c.id = event_requests.church_id
  )
);

drop policy if exists "event requests same church read" on public.event_requests;
create policy "event requests same church read"
on public.event_requests
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_requests.church_id
  )
);

drop policy if exists "event requests admin update" on public.event_requests;
create policy "event requests admin update"
on public.event_requests
for update
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

drop policy if exists "event workflows same church read" on public.event_workflows;
create policy "event workflows same church read"
on public.event_workflows
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
      and (
        public.user_can_manage_church(event_workflows.church_id)
        or event_workflows.visibility = 'shared'
        or event_workflows.owner_name = p.full_name
      )
  )
);

drop policy if exists "event workflows same church insert" on public.event_workflows;
create policy "event workflows same church insert"
on public.event_workflows
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
  )
);

drop policy if exists "event workflows owner update" on public.event_workflows;
create policy "event workflows owner update"
on public.event_workflows
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
      and event_workflows.owner_name = p.full_name
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
      and event_workflows.owner_name = p.full_name
  )
);

drop policy if exists "event workflows owner delete" on public.event_workflows;
create policy "event workflows owner delete"
on public.event_workflows
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
      and event_workflows.owner_name = p.full_name
  )
);

drop policy if exists "automations same church read" on public.automations;
create policy "automations same church read"
on public.automations
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = automations.church_id
  )
);

drop policy if exists "automations manage write" on public.automations;
create policy "automations manage write"
on public.automations
for all
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

drop policy if exists "automation runs same church read" on public.automation_runs;
create policy "automation runs same church read"
on public.automation_runs
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = automation_runs.church_id
  )
);

drop policy if exists "automation runs manage write" on public.automation_runs;
create policy "automation runs manage write"
on public.automation_runs
for all
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

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
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

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
        public.user_can_manage_church(transactions.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
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
        public.user_can_manage_church(transactions.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
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
using (public.user_can_manage_church(church_id))
with check (public.user_can_manage_church(church_id));

drop policy if exists "purchase orders scoped read" on public.purchase_orders;
create policy "purchase orders scoped read"
on public.purchase_orders
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = purchase_orders.church_id
      and (
        public.user_can_manage_church(purchase_orders.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
        or p.id = purchase_orders.requester_id
      )
  )
);

drop policy if exists "purchase orders submit write" on public.purchase_orders;
create policy "purchase orders submit write"
on public.purchase_orders
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = purchase_orders.church_id
  )
);

drop policy if exists "purchase orders finance update" on public.purchase_orders;
create policy "purchase orders finance update"
on public.purchase_orders
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = purchase_orders.church_id
      and (
        public.user_can_manage_church(purchase_orders.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = purchase_orders.church_id
      and (
        public.user_can_manage_church(purchase_orders.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
      )
  )
);

drop policy if exists "purchase orders delete" on public.purchase_orders;
create policy "purchase orders delete"
on public.purchase_orders
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = purchase_orders.church_id
      and (
        public.user_can_manage_church(purchase_orders.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
        or (
          p.id = purchase_orders.requester_id
          and purchase_orders.status in ('pending', 'in-review')
        )
      )
  )
);

-- New churches are created through create_church_with_admin(...)
-- and their staff roster is intentionally built through the Church Team flow.
