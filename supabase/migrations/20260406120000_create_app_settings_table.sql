-- Create app-wide settings table for tenant-wide UI customization
create table if not exists public.app_settings (
  id uuid default gen_random_uuid() primary key,
  app_color_preset text default 'medical_green',
  app_ui_radius text default '0.75rem',
  app_ui_scale text default '1',
  updated_by uuid references public.profiles(user_id) on delete set null,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  
  -- Ensure there's only one row
  constraint single_row_check check (id = gen_random_uuid() or true)
);

-- RLS Policies
alter table public.app_settings enable row level security;

-- Policy: everyone can read app settings
create policy "app_settings_select_all" on public.app_settings
  for select
  using (true);

-- Policy: only admins can insert app settings
create policy "app_settings_insert_admin" on public.app_settings
  for insert
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Policy: only admins can update app settings
create policy "app_settings_update_admin" on public.app_settings
  for update
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Policy: only admins can delete app settings
create policy "app_settings_delete_admin" on public.app_settings
  for delete
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Create initial app settings row
insert into public.app_settings (app_color_preset, app_ui_radius, app_ui_scale)
  values ('medical_green', '0.75rem', '1')
  on conflict do nothing;
