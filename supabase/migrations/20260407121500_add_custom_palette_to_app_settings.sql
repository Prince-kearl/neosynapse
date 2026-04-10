alter table public.app_settings
  add column if not exists app_color_mode text default 'preset' check (app_color_mode in ('preset', 'custom')),
  add column if not exists app_custom_primary_hex text,
  add column if not exists app_custom_accent_hex text,
  add column if not exists app_custom_secondary_hex text,
  add column if not exists app_custom_ring_hex text;

update public.app_settings
set app_color_mode = coalesce(app_color_mode, 'preset')
where app_color_mode is null;