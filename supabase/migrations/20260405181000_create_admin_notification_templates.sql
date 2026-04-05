-- Admin notification templates: reusable message scaffolds for the broadcast composer.
-- Admins can save + reuse titles, body copy, category, target role, and an optional action URL.

create table if not exists public.admin_notification_templates (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  title_template   text    not null,
  body_template    text    not null,
  category     text        not null default 'general',
  target_role  text        null,
  action_url   text        null,
  description  text        null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint admin_notification_templates_category_check
    check (category in ('system','appointment','clinical','general')),

  constraint admin_notification_templates_target_role_check
    check (target_role is null or target_role in ('patient','professional','admin'))
);

-- Unique template names (case-insensitive)
create unique index if not exists admin_notification_templates_name_unique_idx
  on public.admin_notification_templates (lower(btrim(name)));

-- Keep updated_at current
create or replace function public.set_admin_notification_template_updated_at()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_notification_templates_updated_at
  on public.admin_notification_templates;

create trigger trg_admin_notification_templates_updated_at
  before update on public.admin_notification_templates
  for each row execute function public.set_admin_notification_template_updated_at();

-- ────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────
alter table public.admin_notification_templates enable row level security;

drop policy if exists "admins can read notification templates"
  on public.admin_notification_templates;
create policy "admins can read notification templates"
  on public.admin_notification_templates
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

drop policy if exists "admins can insert notification templates"
  on public.admin_notification_templates;
create policy "admins can insert notification templates"
  on public.admin_notification_templates
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

drop policy if exists "admins can update notification templates"
  on public.admin_notification_templates;
create policy "admins can update notification templates"
  on public.admin_notification_templates
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

drop policy if exists "admins can delete notification templates"
  on public.admin_notification_templates;
create policy "admins can delete notification templates"
  on public.admin_notification_templates
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

-- ────────────────────────────────────────────────────────
-- Seed default templates
-- ────────────────────────────────────────────────────────
insert into public.admin_notification_templates
  (name, title_template, body_template, category, target_role, description, is_active)
values
  (
    'Scheduled Maintenance',
    'Scheduled System Maintenance',
    'We will be performing scheduled maintenance on {{date}} from {{start_time}} to {{end_time}} UTC. Some features may be temporarily unavailable.',
    'system',
    null,
    'Use when announcing a maintenance window to all users.',
    true
  ),
  (
    'Welcome — Professionals',
    'Welcome to NeoSynapse',
    'Your professional account is now active. You can start managing patients, scheduling encounters, and using our AI-assisted clinical tools.',
    'general',
    'professional',
    'Sent to newly onboarded healthcare professionals.',
    true
  ),
  (
    'Welcome — Patients',
    'Welcome to NeoSynapse',
    'Your patient account is ready. Book appointments, review your medical history, and connect with your care team — all in one place.',
    'general',
    'patient',
    'Sent to newly registered patients.',
    true
  ),
  (
    'New Feature Announcement',
    'New Feature Available',
    'We just launched {{feature_name}}. Learn more and get started by visiting your dashboard.',
    'system',
    null,
    'Generic feature launch announcement. Fill in feature_name before sending.',
    true
  ),
  (
    'Policy / Terms Update',
    'Important: Updated Terms of Service',
    'Our Terms of Service have been updated effective {{effective_date}}. Please review the changes in your account settings.',
    'system',
    null,
    'Regulatory / compliance notification for policy changes.',
    true
  )
on conflict do nothing;
