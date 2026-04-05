-- Configurable quick actions for Admin Dashboard
create table if not exists public.admin_quick_actions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  path text not null,
  description text not null,
  icon text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_quick_actions enable row level security;

drop policy if exists "admins can read quick actions" on public.admin_quick_actions;
create policy "admins can read quick actions"
on public.admin_quick_actions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins can insert quick actions" on public.admin_quick_actions;
create policy "admins can insert quick actions"
on public.admin_quick_actions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins can update quick actions" on public.admin_quick_actions;
create policy "admins can update quick actions"
on public.admin_quick_actions
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins can delete quick actions" on public.admin_quick_actions;
create policy "admins can delete quick actions"
on public.admin_quick_actions
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

insert into public.admin_quick_actions (label, path, description, icon, is_active, display_order)
select *
from (
  values
    ('Invite Professional', '/admin/invitations', 'Send invite link', 'Mail', true, 1),
    ('Manage Users', '/admin/users', 'View all accounts', 'Users', true, 2),
    ('Add Facility', '/admin/facilities', 'Register location', 'Building2', true, 3),
    ('View Audit Log', '/admin/audit', 'Review activity', 'ScrollText', true, 4)
) as defaults(label, path, description, icon, is_active, display_order)
where not exists (
  select 1
  from public.admin_quick_actions
);