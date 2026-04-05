-- Allow authenticated users (including patients) to discover active professionals for telemedicine.
-- Keeps scope limited to professional directory rows only.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Authenticated can view active professional profiles'
  ) then
    create policy "Authenticated can view active professional profiles"
      on public.profiles for select
      to authenticated
      using (
        role = 'professional'
        and coalesce(status, 'active') <> 'disabled'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professional_profiles'
      and policyname = 'Authenticated can view active professional details'
  ) then
    create policy "Authenticated can view active professional details"
      on public.professional_profiles for select
      to authenticated
      using (
        verification_status <> 'rejected'
        and exists (
          select 1
          from public.profiles p
          where p.user_id = professional_profiles.user_id
            and p.role = 'professional'
            and coalesce(p.status, 'active') <> 'disabled'
        )
      );
  end if;
end $$;
