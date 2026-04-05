do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_quick_actions'
  ) then
    alter publication supabase_realtime add table public.admin_quick_actions;
  end if;
end
$$;