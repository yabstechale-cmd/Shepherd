create extension if not exists pgcrypto;

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  account_admin_user_id uuid references auth.users(id) on delete set null,
  account_admin_email text,
  account_manager_user_ids uuid[] not null default '{}',
  account_manager_emails text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.churches add column if not exists name text;
alter table public.churches add column if not exists code text;
alter table public.churches add column if not exists account_admin_user_id uuid references auth.users(id) on delete set null;
alter table public.churches add column if not exists account_admin_email text;
alter table public.churches add column if not exists account_manager_user_ids uuid[] not null default '{}';
alter table public.churches add column if not exists account_manager_emails text[] not null default '{}';
alter table public.churches add column if not exists google_calendar_id text;
alter table public.churches add column if not exists google_calendar_title text;
alter table public.churches add column if not exists google_calendar_ids text[] not null default '{}';
alter table public.churches add column if not exists google_calendar_titles text[] not null default '{}';

update public.churches
set
  google_calendar_title = case
    when google_calendar_id is not null then name || '_google calendar'
    else google_calendar_title
  end,
  google_calendar_titles = case
    when cardinality(google_calendar_ids) > 0 then array(
      select name || '_google calendar' || case when cardinality(google_calendar_ids) > 1 then ' ' || calendar_index::text else '' end
      from generate_subscripts(google_calendar_ids, 1) as s(calendar_index)
      order by calendar_index
    )
    else google_calendar_titles
  end
where google_calendar_id is not null
  or cardinality(google_calendar_ids) > 0;
alter table public.churches add column if not exists deletion_requested_at timestamptz;
alter table public.churches add column if not exists deletion_requested_by uuid references auth.users(id) on delete set null;
alter table public.churches add column if not exists deletion_requested_by_name text;
alter table public.churches add column if not exists deletion_reviewer_user_ids uuid[] not null default '{}';
alter table public.churches add column if not exists deletion_approvals jsonb not null default '[]'::jsonb;
alter table public.churches add column if not exists deletion_hold_until timestamptz;
alter table public.churches add column if not exists created_at timestamptz not null default now();

create unique index if not exists churches_code_key on public.churches (code);

alter table public.churches
  enable row level security;

create table if not exists public.church_google_connections (
  church_id uuid primary key references public.churches(id) on delete cascade,
  connected_by uuid references public.profiles(id) on delete set null,
  google_account_email text,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.church_google_connections add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.church_google_connections add column if not exists connected_by uuid references public.profiles(id) on delete set null;
alter table public.church_google_connections add column if not exists google_account_email text;
alter table public.church_google_connections add column if not exists refresh_token text;
alter table public.church_google_connections add column if not exists created_at timestamptz not null default now();
alter table public.church_google_connections add column if not exists updated_at timestamptz not null default now();

alter table public.church_google_connections
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
  photo_url text,
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
alter table public.church_staff add column if not exists photo_url text;
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
  photo_url text,
  ministries text[] not null default '{}',
  can_see_team_overview boolean not null default true,
  can_see_admin_overview boolean not null default false,
  read_only_oversight boolean not null default false,
  current_focus_task_id uuid references public.tasks(id) on delete set null,
  current_focus_updated_at timestamptz,
  walkthrough_prompt_count integer not null default 0,
  walkthrough_completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.profiles add column if not exists staff_id uuid references public.church_staff(id) on delete set null;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists staff_roles text[] not null default '{}';
alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists ministries text[] not null default '{}';
alter table public.profiles add column if not exists can_see_team_overview boolean not null default true;
alter table public.profiles add column if not exists can_see_admin_overview boolean not null default false;
alter table public.profiles add column if not exists read_only_oversight boolean not null default false;
alter table public.profiles add column if not exists current_focus_task_id uuid references public.tasks(id) on delete set null;
alter table public.profiles add column if not exists current_focus_updated_at timestamptz;
alter table public.profiles add column if not exists walkthrough_prompt_count integer not null default 0;
alter table public.profiles add column if not exists walkthrough_completed_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_role_check;

create unique index if not exists profiles_staff_id_key on public.profiles (staff_id) where staff_id is not null;

alter table public.profiles
  enable row level security;

create or replace function public.enforce_profile_staff_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_name text;
begin
  if new.staff_id is not null then
    select full_name
    into staff_name
    from public.church_staff
    where id = new.staff_id
      and church_id = new.church_id;

    if staff_name is not null then
      new.full_name := staff_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_staff_name_trigger on public.profiles;
create trigger enforce_profile_staff_name_trigger
before insert or update of full_name, staff_id, church_id
on public.profiles
for each row
execute function public.enforce_profile_staff_name();

create or replace function public.sync_profile_staff_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set full_name = new.full_name
  where staff_id = new.id
    and church_id = new.church_id
    and full_name is distinct from new.full_name;

  return new;
end;
$$;

drop trigger if exists sync_profile_staff_name_trigger on public.church_staff;
create trigger sync_profile_staff_name_trigger
after update of full_name
on public.church_staff
for each row
execute function public.sync_profile_staff_name();

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
  comments jsonb not null default '[]'::jsonb,
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
alter table public.tasks add column if not exists comments jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists review_history jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists created_at timestamptz not null default now();

alter table public.tasks
  enable row level security;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  detail text not null,
  target text not null default 'dashboard',
  task_id uuid references public.tasks(id) on delete cascade,
  source_key text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.notifications add column if not exists recipient_profile_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists actor_profile_id uuid references public.profiles(id) on delete set null;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists detail text;
alter table public.notifications add column if not exists target text not null default 'dashboard';
alter table public.notifications add column if not exists task_id uuid references public.tasks(id) on delete cascade;
alter table public.notifications add column if not exists source_key text;
alter table public.notifications add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists archived_at timestamptz;
alter table public.notifications add column if not exists emailed_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

create unique index if not exists notifications_task_assignment_key
  on public.notifications (recipient_profile_id, type, task_id);

create unique index if not exists notifications_recipient_type_source_key
  on public.notifications (recipient_profile_id, type, source_key);

alter table public.notifications
  enable row level security;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_title text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_logs add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.activity_logs add column if not exists actor_profile_id uuid references public.profiles(id) on delete set null;
alter table public.activity_logs add column if not exists actor_name text;
alter table public.activity_logs add column if not exists action text;
alter table public.activity_logs add column if not exists entity_type text;
alter table public.activity_logs add column if not exists entity_id text;
alter table public.activity_logs add column if not exists entity_title text;
alter table public.activity_logs add column if not exists summary text;
alter table public.activity_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.activity_logs add column if not exists created_at timestamptz not null default now();

create index if not exists activity_logs_church_created_at_idx
  on public.activity_logs (church_id, created_at desc);

alter table public.activity_logs
  enable row level security;

create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  status text not null default 'new',
  decided_at timestamptz,
  decided_by text,
  requested_by text,
  submission_source text not null default 'staff',
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
alter table public.event_requests add column if not exists submission_source text not null default 'staff';
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
alter table public.event_requests add column if not exists public_access_token text;
alter table public.event_requests add column if not exists public_access_enabled boolean not null default true;
alter table public.event_requests add column if not exists public_comments jsonb not null default '[]'::jsonb;

update public.event_requests
set submission_source = case
  when public_access_token is not null then 'guest'
  else 'staff'
end
where submission_source is null
  or submission_source not in ('staff', 'guest');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_requests_submission_source_check'
      and conrelid = 'public.event_requests'::regclass
  ) then
    alter table public.event_requests
      add constraint event_requests_submission_source_check
      check (submission_source in ('staff', 'guest'));
  end if;
end $$;

create unique index if not exists event_requests_public_access_token_key
  on public.event_requests (public_access_token)
  where public_access_token is not null;

alter table public.event_requests
  enable row level security;

create table if not exists public.event_request_rate_limits (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  requester_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_request_rate_limits_key_created_at_idx
  on public.event_request_rate_limits (requester_key, created_at desc);

alter table public.event_request_rate_limits
  enable row level security;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  event_date date not null,
  start_time text,
  end_time text,
  location text,
  google_calendar_source_id text,
  google_calendar_source_title text,
  google_calendar_source_event_id text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.calendar_events add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.calendar_events add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.calendar_events add column if not exists title text;
alter table public.calendar_events add column if not exists event_date date;
alter table public.calendar_events add column if not exists start_time text;
alter table public.calendar_events add column if not exists end_time text;
alter table public.calendar_events add column if not exists location text;
alter table public.calendar_events add column if not exists google_calendar_source_id text;
alter table public.calendar_events add column if not exists google_calendar_source_title text;
alter table public.calendar_events add column if not exists google_calendar_source_event_id text;
alter table public.calendar_events add column if not exists notes text;
alter table public.calendar_events add column if not exists created_at timestamptz not null default now();

alter table public.calendar_events
  enable row level security;

create table if not exists public.staff_availability_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  requested_by text not null,
  requester_email text,
  request_type text not null,
  from_date date not null,
  to_date date,
  start_time text,
  end_time text,
  reason text,
  notes text,
  status text not null default 'submitted',
  required_approvers text[] not null default '{}',
  approvals text[] not null default '{}',
  approval_history jsonb not null default '[]'::jsonb,
  calendar_event_ids uuid[] not null default '{}',
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);

alter table public.staff_availability_requests add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.staff_availability_requests add column if not exists requester_id uuid references public.profiles(id) on delete set null;
alter table public.staff_availability_requests add column if not exists requested_by text;
alter table public.staff_availability_requests add column if not exists requester_email text;
alter table public.staff_availability_requests add column if not exists request_type text;
alter table public.staff_availability_requests add column if not exists from_date date;
alter table public.staff_availability_requests add column if not exists to_date date;
alter table public.staff_availability_requests add column if not exists start_time text;
alter table public.staff_availability_requests add column if not exists end_time text;
alter table public.staff_availability_requests add column if not exists reason text;
alter table public.staff_availability_requests add column if not exists notes text;
alter table public.staff_availability_requests add column if not exists status text not null default 'submitted';
alter table public.staff_availability_requests add column if not exists required_approvers text[] not null default '{}';
alter table public.staff_availability_requests add column if not exists approvals text[] not null default '{}';
alter table public.staff_availability_requests add column if not exists approval_history jsonb not null default '[]'::jsonb;
alter table public.staff_availability_requests add column if not exists calendar_event_ids uuid[] not null default '{}';
alter table public.staff_availability_requests add column if not exists decided_at timestamptz;
alter table public.staff_availability_requests add column if not exists decided_by text;
alter table public.staff_availability_requests add column if not exists created_at timestamptz not null default now();

alter table public.staff_availability_requests
  enable row level security;

create table if not exists public.church_lockup_assignments (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  assigned_by_id uuid references public.profiles(id) on delete set null,
  assigned_by text not null,
  week_of date not null,
  service_label text not null default 'Sunday Services',
  assignee_names text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.church_lockup_assignments add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.church_lockup_assignments add column if not exists assigned_by_id uuid references public.profiles(id) on delete set null;
alter table public.church_lockup_assignments add column if not exists assigned_by text;
alter table public.church_lockup_assignments add column if not exists week_of date;
alter table public.church_lockup_assignments add column if not exists service_label text not null default 'Sunday Services';
alter table public.church_lockup_assignments add column if not exists assignee_names text[] not null default '{}';
alter table public.church_lockup_assignments add column if not exists notes text;
alter table public.church_lockup_assignments add column if not exists created_at timestamptz not null default now();

create unique index if not exists church_lockup_assignments_church_week_key
  on public.church_lockup_assignments (church_id, week_of);

alter table public.church_lockup_assignments
  enable row level security;

create table if not exists public.event_workflows (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  linked_event_request_id uuid references public.event_requests(id) on delete set null,
  title text not null,
  event_name text,
  owner_name text not null,
  visibility text not null default 'shared',
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
alter table public.event_workflows add column if not exists visibility text not null default 'shared';
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
  added_by_id uuid references public.profiles(id) on delete set null,
  added_by text,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists church_id uuid references public.churches(id) on delete cascade;
alter table public.transactions add column if not exists description text;
alter table public.transactions add column if not exists amount numeric;
alter table public.transactions add column if not exists ministry text;
alter table public.transactions add column if not exists category text;
alter table public.transactions add column if not exists date date not null default current_date;
alter table public.transactions add column if not exists added_by_id uuid references public.profiles(id) on delete set null;
alter table public.transactions add column if not exists added_by text;
alter table public.transactions add column if not exists created_at timestamptz not null default now();

update public.transactions
set
  added_by_id = coalesce(added_by_id, '725a6cc4-106d-4c7f-9819-b994c1927f53'::uuid),
  added_by = coalesce(nullif(added_by, ''), 'Yabs Techale')
where church_id = '11111111-1111-1111-1111-111111111111'::uuid
  and (added_by is null or added_by = '' or added_by_id is null);

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

create or replace function public.list_public_churches()
returns table (
  id uuid,
  name text
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name
  from public.churches c
  order by c.name;
$$;

create or replace function public.get_public_church_access(
  p_church_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  church_payload jsonb;
  staff_payload jsonb;
begin
  if p_church_id is null then
    raise exception 'Church is required.';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name
  )
  into church_payload
  from public.churches c
  where c.id = p_church_id;

  if church_payload is null then
    raise exception 'That church could not be found.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'church_id', s.church_id,
    'full_name', s.full_name,
    'role', s.role,
    'staff_roles', coalesce(s.staff_roles, '{}'::text[]),
    'title', s.title,
    'email', s.email,
    'auth_user_id', s.auth_user_id,
    'ministries', coalesce(s.ministries, '{}'::text[]),
    'can_see_team_overview', coalesce(s.can_see_team_overview, false),
    'can_see_admin_overview', coalesce(s.can_see_admin_overview, false),
    'read_only_oversight', coalesce(s.read_only_oversight, false)
  ) order by s.full_name), '[]'::jsonb)
  into staff_payload
  from public.church_staff s
  where s.church_id = p_church_id;

  return jsonb_build_object(
    'church', church_payload,
    'users', staff_payload
  );
end;
$$;

create or replace function public.get_public_church_by_code(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  church_payload jsonb;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Church code is required.';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name
  )
  into church_payload
  from public.churches c
  where lower(c.code) = lower(trim(p_code));

  if church_payload is null then
    raise exception 'That church code was not found.';
  end if;

  return church_payload;
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
set search_path = public, auth
as $$
declare
  created_church_id uuid;
  created_staff_id uuid;
begin
  if p_user_id is null then
    raise exception 'Missing administrator account.';
  end if;

  if auth.uid() is not null and p_user_id <> auth.uid() then
    raise exception 'Church accounts can only be created for the current signed-in user.';
  end if;

  if auth.uid() is null and not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) = lower(trim(p_email))
  ) then
    raise exception 'We could not verify the administrator account for this church.';
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
        or p.id = any(coalesce(c.account_manager_user_ids, '{}'::uuid[]))
        or (
          c.account_admin_email is not null
          and lower(c.account_admin_email) = lower(coalesce(p.email, ''))
        )
        or exists (
          select 1
          from unnest(coalesce(c.account_manager_emails, '{}'::text[])) as manager_email
          where lower(manager_email) = lower(coalesce(p.email, ''))
        )
      )
  )
  into can_manage;

  return coalesce(can_manage, false);
end;
$$;

create or replace function public.user_can_manage_calendar_settings(
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
    where p.id = auth.uid()
      and p.church_id = p_church_id
      and (
        p.role in ('church_administrator', 'admin')
        or 'church_administrator' = any(coalesce(p.staff_roles, '{}'::text[]))
        or lower(coalesce(p.title, '')) = 'church administrator'
      )
  )
  into can_manage;

  return coalesce(can_manage, false);
end;
$$;

create or replace function public.user_is_church_administrator(
  p_church_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := false;
begin
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = p_church_id
      and (
        p.role = 'church_administrator'
        or 'church_administrator' = any(coalesce(p.staff_roles, '{}'::text[]))
        or lower(coalesce(p.title, '')) = 'church administrator'
      )
  )
  into is_admin;

  return coalesce(is_admin, false);
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
  church_row public.churches%rowtype;
  delete_user_ids uuid[];
  approval_count integer := 0;
  required_approval_count integer := 0;
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

  select *
  into church_row
  from public.churches
  where id = p_church_id;

  if not found then
    raise exception 'Church account not found.';
  end if;

  if not public.user_can_manage_church(p_church_id) then
    raise exception 'Only Shepherd Account Managers can finalize a church account deletion.';
  end if;

  if church_row.deletion_requested_at is null then
    raise exception 'A deletion request has not been started for this church account.';
  end if;

  select count(distinct (approval->>'reviewer_id')::uuid)
  into approval_count
  from jsonb_array_elements(coalesce(church_row.deletion_approvals, '[]'::jsonb)) approval
  where (approval->>'reviewer_id') is not null
    and (approval->>'approved_at') is not null
    and (approval->>'reviewer_id')::uuid <> coalesce(church_row.deletion_requested_by, '00000000-0000-0000-0000-000000000000'::uuid);

  required_approval_count := coalesce(array_length(church_row.deletion_reviewer_user_ids, 1), 0);

  if approval_count < required_approval_count then
    raise exception 'Church account deletion requires approval from all other Shepherd Account Managers.';
  end if;

  if church_row.deletion_hold_until is null or church_row.deletion_hold_until > now() then
    raise exception 'Church account deletion is still in the 30-day hold period.';
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

create or replace function public.prevent_unsafe_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.id and not public.user_can_manage_church(coalesce(old.church_id, new.church_id)) then
    if old.church_id is distinct from new.church_id
      or old.staff_id is distinct from new.staff_id
      or old.full_name is distinct from new.full_name
      or old.role is distinct from new.role
      or old.staff_roles is distinct from new.staff_roles
      or old.title is distinct from new.title
      or old.ministries is distinct from new.ministries
      or old.can_see_team_overview is distinct from new.can_see_team_overview
      or old.can_see_admin_overview is distinct from new.can_see_admin_overview
      or old.read_only_oversight is distinct from new.read_only_oversight
      or (
        old.email is distinct from new.email
        and lower(coalesce(new.email, '')) <> lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    then
      raise exception 'Profile access fields can only be changed by an authorized church manager.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_self_update on public.profiles;
create trigger protect_profile_self_update
before update on public.profiles
for each row
execute function public.prevent_unsafe_profile_self_update();

grant execute on function public.reserve_staff_registration(uuid, uuid, text) to anon, authenticated;
grant execute on function public.claim_staff_profile(uuid, uuid) to authenticated;
grant execute on function public.list_public_churches() to anon, authenticated;
grant execute on function public.get_public_church_access(uuid) to anon, authenticated;
grant execute on function public.get_public_church_by_code(text) to anon, authenticated;
grant execute on function public.create_church_with_admin(text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.user_can_manage_church(uuid) to authenticated;
grant execute on function public.user_can_manage_calendar_settings(uuid) to authenticated;
grant execute on function public.user_is_church_administrator(uuid) to authenticated;
grant execute on function public.delete_church_account(uuid) to authenticated;

create or replace function public.add_task_comment(
  p_task_id uuid,
  p_comment_id text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
  commenter_name text;
  commenter_church uuid;
  new_comment jsonb;
  next_comments jsonb;
begin
  select full_name, church_id
  into commenter_name, commenter_church
  from public.profiles
  where id = auth.uid();

  if commenter_name is null then
    raise exception 'Profile not found for current user';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.church_id <> commenter_church then
    raise exception 'You do not have access to this task';
  end if;

  if trim(coalesce(p_body, '')) = '' then
    raise exception 'Comment body is required';
  end if;

  new_comment := jsonb_build_object(
    'id', coalesce(nullif(trim(p_comment_id), ''), gen_random_uuid()::text),
    'author', commenter_name,
    'body', trim(p_body),
    'created_at', now()
  );

  next_comments := coalesce(task_row.comments, '[]'::jsonb) || jsonb_build_array(new_comment);

  update public.tasks
  set comments = next_comments
  where id = p_task_id;

  return next_comments;
end;
$$;

grant execute on function public.add_task_comment(uuid, text, text) to authenticated;

create or replace function public.update_task_comment(
  p_task_id uuid,
  p_comment_id text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
  commenter_name text;
  commenter_church uuid;
  next_comments jsonb;
begin
  select full_name, church_id
  into commenter_name, commenter_church
  from public.profiles
  where id = auth.uid();

  if commenter_name is null then
    raise exception 'Profile not found for current user';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.church_id <> commenter_church then
    raise exception 'You do not have access to this task';
  end if;

  if trim(coalesce(p_body, '')) = '' then
    raise exception 'Comment body is required';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(task_row.comments, '[]'::jsonb)) as entry
    where entry->>'id' = p_comment_id
      and lower(coalesce(entry->>'author', '')) = lower(commenter_name)
  ) then
    raise exception 'You can only edit your own comments';
  end if;

  select coalesce(
    jsonb_agg(
      case
        when entry.value->>'id' = p_comment_id then
          jsonb_set(
            jsonb_set(entry.value, '{body}', to_jsonb(trim(p_body))),
            '{updated_at}',
            to_jsonb(now())
          )
        else entry.value
      end
      order by entry.ordinality
    ),
    '[]'::jsonb
  )
  into next_comments
  from jsonb_array_elements(coalesce(task_row.comments, '[]'::jsonb)) with ordinality as entry(value, ordinality);

  update public.tasks
  set comments = next_comments
  where id = p_task_id;

  return next_comments;
end;
$$;

grant execute on function public.update_task_comment(uuid, text, text) to authenticated;

create or replace function public.delete_task_comment(
  p_task_id uuid,
  p_comment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
  commenter_name text;
  commenter_church uuid;
  next_comments jsonb;
begin
  select full_name, church_id
  into commenter_name, commenter_church
  from public.profiles
  where id = auth.uid();

  if commenter_name is null then
    raise exception 'Profile not found for current user';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.church_id <> commenter_church then
    raise exception 'You do not have access to this task';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(task_row.comments, '[]'::jsonb)) as entry
    where entry->>'id' = p_comment_id
      and lower(coalesce(entry->>'author', '')) = lower(commenter_name)
  ) then
    raise exception 'You can only delete your own comments';
  end if;

  select coalesce(
    jsonb_agg(entry.value order by entry.ordinality),
    '[]'::jsonb
  )
  into next_comments
  from jsonb_array_elements(coalesce(task_row.comments, '[]'::jsonb)) with ordinality as entry(value, ordinality)
  where entry.value->>'id' <> p_comment_id;

  update public.tasks
  set comments = next_comments
  where id = p_task_id;

  return next_comments;
end;
$$;

grant execute on function public.delete_task_comment(uuid, text) to authenticated;

drop policy if exists "church code lookup" on public.churches;
create policy "church code lookup"
on public.churches
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = churches.id
  )
);

drop policy if exists "church admin write" on public.churches;
create policy "church admin write"
on public.churches
for update
using (public.user_can_manage_church(id))
with check (public.user_can_manage_church(id));

drop policy if exists "church google connection admin read" on public.church_google_connections;
create policy "church google connection admin read"
on public.church_google_connections
for select
using (public.user_can_manage_calendar_settings(church_id));

drop policy if exists "church google connection admin write" on public.church_google_connections;
create policy "church google connection admin write"
on public.church_google_connections
for all
using (public.user_can_manage_calendar_settings(church_id))
with check (public.user_can_manage_calendar_settings(church_id));

drop policy if exists "church staff lookup" on public.church_staff;
create policy "church staff lookup"
on public.church_staff
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = church_staff.church_id
  )
);

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
for update
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

drop policy if exists "notifications recipient read" on public.notifications;
create policy "notifications recipient read"
on public.notifications
for select
using (recipient_profile_id = auth.uid());

drop policy if exists "notifications same church insert" on public.notifications;
create policy "notifications same church insert"
on public.notifications
for insert
with check (
  actor_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles actor
    join public.profiles recipient on recipient.id = notifications.recipient_profile_id
    where actor.id = auth.uid()
      and actor.church_id = notifications.church_id
      and recipient.church_id = notifications.church_id
  )
);

drop policy if exists "notifications recipient update" on public.notifications;
create policy "notifications recipient update"
on public.notifications
for update
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());

drop policy if exists "activity logs manager read" on public.activity_logs;
create policy "activity logs manager read"
on public.activity_logs
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = activity_logs.church_id
      and p.id = '725a6cc4-106d-4c7f-9819-b994c1927f53'::uuid
  )
);

drop policy if exists "activity logs same church insert" on public.activity_logs;
create policy "activity logs same church insert"
on public.activity_logs
for insert
with check (
  actor_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles actor
    where actor.id = auth.uid()
      and actor.church_id = activity_logs.church_id
  )
);

drop policy if exists "event requests public submit" on public.event_requests;
drop policy if exists "event requests authenticated submit" on public.event_requests;
create policy "event requests authenticated submit"
on public.event_requests
for insert
with check (
  auth.uid() is not null
  and
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_requests.church_id
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
using (public.user_is_church_administrator(church_id))
with check (public.user_is_church_administrator(church_id));

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
  )
);

update public.event_workflows
set visibility = 'shared'
where visibility is distinct from 'shared';

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
  public.user_is_church_administrator(church_id)
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
      and event_workflows.owner_name = p.full_name
  )
)
with check (
  public.user_is_church_administrator(church_id)
  or
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
  public.user_is_church_administrator(church_id)
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = event_workflows.church_id
      and event_workflows.owner_name = p.full_name
  )
);

drop policy if exists "calendar events same church read" on public.calendar_events;
create policy "calendar events same church read"
on public.calendar_events
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = calendar_events.church_id
  )
);

drop policy if exists "calendar events same church insert" on public.calendar_events;
create policy "calendar events same church insert"
on public.calendar_events
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = calendar_events.church_id
      and p.id = calendar_events.created_by
  )
);

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
      and (
        p.id = calendar_events.created_by
        or public.user_can_manage_church(calendar_events.church_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = calendar_events.church_id
      and (
        p.id = calendar_events.created_by
        or public.user_can_manage_church(calendar_events.church_id)
      )
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
      and (
        p.id = calendar_events.created_by
        or public.user_can_manage_church(calendar_events.church_id)
      )
  )
);

drop policy if exists "staff availability same church read" on public.staff_availability_requests;
create policy "staff availability same church read"
on public.staff_availability_requests
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = staff_availability_requests.church_id
  )
);

drop policy if exists "staff availability submit write" on public.staff_availability_requests;
create policy "staff availability submit write"
on public.staff_availability_requests
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = staff_availability_requests.church_id
      and p.id = staff_availability_requests.requester_id
  )
);

drop policy if exists "staff availability requester or admin update" on public.staff_availability_requests;
create policy "staff availability requester or admin update"
on public.staff_availability_requests
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = staff_availability_requests.church_id
      and (
        p.id = staff_availability_requests.requester_id
        or public.user_can_manage_church(staff_availability_requests.church_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = staff_availability_requests.church_id
      and (
        p.id = staff_availability_requests.requester_id
        or public.user_can_manage_church(staff_availability_requests.church_id)
      )
  )
);

drop policy if exists "church lockup same church read" on public.church_lockup_assignments;
create policy "church lockup same church read"
on public.church_lockup_assignments
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = church_lockup_assignments.church_id
  )
);

drop policy if exists "church lockup same church insert" on public.church_lockup_assignments;
create policy "church lockup same church insert"
on public.church_lockup_assignments
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = church_lockup_assignments.church_id
      and p.id = church_lockup_assignments.assigned_by_id
  )
);

drop policy if exists "church lockup same church update" on public.church_lockup_assignments;
create policy "church lockup same church update"
on public.church_lockup_assignments
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = church_lockup_assignments.church_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.church_id = church_lockup_assignments.church_id
  )
);

drop policy if exists "people same church read" on public.people;
drop policy if exists "people admin write" on public.people;

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
      and (
        public.user_can_manage_church(transactions.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
        or p.role = 'finance_director'
        or 'finance_director' = any(coalesce(p.staff_roles, '{}'::text[]))
        or transactions.ministry = any(coalesce(p.ministries, '{}'::text[]))
      )
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
      and (
        public.user_can_manage_church(ministries.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
        or p.role = 'finance_director'
        or 'finance_director' = any(coalesce(p.staff_roles, '{}'::text[]))
        or ministries.name = any(coalesce(p.ministries, '{}'::text[]))
      )
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
      and (
        public.user_can_manage_church(purchase_orders.church_id)
        or 'Finances' = any(coalesce(p.ministries, '{}'::text[]))
        or p.role = 'finance_director'
        or 'finance_director' = any(coalesce(p.staff_roles, '{}'::text[]))
        or purchase_orders.ministry = any(coalesce(p.ministries, '{}'::text[]))
      )
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
