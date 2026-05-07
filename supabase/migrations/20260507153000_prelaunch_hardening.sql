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
    'full_name', s.full_name,
    'title', s.title,
    'has_registered_account', (
      s.auth_user_id is not null
      or nullif(trim(coalesce(s.email, '')), '') is not null
    )
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

drop policy if exists "church google connection admin read" on public.church_google_connections;
drop policy if exists "church google connection admin write" on public.church_google_connections;
