-- Keep user_roles canonical after elevation.
-- Admin access to patient/professional portals is granted by app guards,
-- so lower-priority role rows should not remain attached to admin users.

delete from public.user_roles lower_roles
where lower_roles.role in ('patient', 'professional')
  and exists (
    select 1
    from public.user_roles admin_roles
    where admin_roles.user_id = lower_roles.user_id
      and admin_roles.role = 'admin'
  );

delete from public.user_roles patient_roles
where patient_roles.role = 'patient'
  and exists (
    select 1
    from public.user_roles professional_roles
    where professional_roles.user_id = patient_roles.user_id
      and professional_roles.role = 'professional'
  );

update public.profiles p
set role = 'admin',
    updated_at = now()
where exists (
  select 1
  from public.user_roles ur
  where ur.user_id = p.user_id
    and ur.role = 'admin'
);

update public.profiles p
set role = 'professional',
    updated_at = now()
where p.role <> 'admin'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p.user_id
      and ur.role = 'professional'
  );
