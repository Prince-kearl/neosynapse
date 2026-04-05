create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'general',
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notifications_category_check check (
    category in ('general', 'appointment', 'clinical', 'system', 'security')
  )
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_unread_idx
  on public.user_notifications (user_id, is_read)
  where is_read = false;

alter table public.user_notifications enable row level security;

drop policy if exists "users can read own notifications" on public.user_notifications;
create policy "users can read own notifications"
on public.user_notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own notifications" on public.user_notifications;
create policy "users can insert own notifications"
on public.user_notifications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own notifications" on public.user_notifications;
create policy "users can update own notifications"
on public.user_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own notifications" on public.user_notifications;
create policy "users can delete own notifications"
on public.user_notifications
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.touch_user_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_notifications_updated_at on public.user_notifications;
create trigger trg_user_notifications_updated_at
before update on public.user_notifications
for each row
execute function public.touch_user_notifications_updated_at();

insert into public.user_notifications (user_id, title, body, category, action_url, metadata)
select
  p.id,
  'Welcome to Neo Synapse',
  'Your notification center is now live. New updates will show here in real time.',
  'system',
  null,
  jsonb_build_object('seeded', true)
from public.profiles p
join auth.users u on u.id = p.id
where not exists (
  select 1
  from public.user_notifications n
  where n.user_id = p.id
);
