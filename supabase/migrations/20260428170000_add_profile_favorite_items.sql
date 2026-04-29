alter table public.profiles
add column if not exists favorite_items jsonb not null default '[]'::jsonb;
