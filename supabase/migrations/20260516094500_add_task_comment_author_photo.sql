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
  commenter_photo_url text;
  new_comment jsonb;
  next_comments jsonb;
begin
  select full_name, church_id, photo_url
  into commenter_name, commenter_church, commenter_photo_url
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
    'author_photo_url', nullif(trim(coalesce(commenter_photo_url, '')), ''),
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
