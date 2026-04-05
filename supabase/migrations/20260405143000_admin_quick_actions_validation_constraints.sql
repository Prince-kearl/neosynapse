do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_quick_actions_path_check'
  ) then
    alter table public.admin_quick_actions
      add constraint admin_quick_actions_path_check
      check (path ~ '^/admin(/|$)');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_quick_actions_icon_check'
  ) then
    alter table public.admin_quick_actions
      add constraint admin_quick_actions_icon_check
      check (icon in ('Mail', 'Users', 'Building2', 'ScrollText', 'ShieldCheck', 'Activity', 'Settings'));
  end if;
end
$$;

create unique index if not exists admin_quick_actions_label_unique_idx
  on public.admin_quick_actions (lower(btrim(label)));

create unique index if not exists admin_quick_actions_path_unique_idx
  on public.admin_quick_actions (lower(btrim(path)));