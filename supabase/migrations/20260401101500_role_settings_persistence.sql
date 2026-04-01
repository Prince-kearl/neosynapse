-- Persist role-specific settings in DB-backed profile tables

alter table public.profiles
  add column if not exists settings_json jsonb;

alter table public.professional_profiles
  add column if not exists settings_json jsonb;
