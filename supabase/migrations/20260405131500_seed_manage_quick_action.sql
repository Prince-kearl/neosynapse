insert into public.admin_quick_actions (label, path, description, icon, is_active, display_order)
select 'Manage Quick Actions', '/admin/quick-actions', 'Configure dashboard tiles', 'Settings', true, 5
where not exists (
  select 1
  from public.admin_quick_actions
  where path = '/admin/quick-actions'
);