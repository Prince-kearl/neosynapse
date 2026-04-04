create table if not exists public.medical_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  existing_conditions text[] not null default '{}',
  allergies text[] not null default '{}',
  current_medications text[] not null default '{}',
  past_surgeries text[] not null default '{}',
  family_medical_history text,
  notes text,
  onboarding_completed boolean not null default false,
  privacy_acknowledged_at timestamptz,
  completed_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_history_files (
  id uuid primary key default gen_random_uuid(),
  medical_history_id uuid not null references public.medical_history(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'medical-history-documents',
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint,
  document_type text not null default 'medical_record',
  created_at timestamptz not null default now()
);

create index if not exists medical_history_user_id_idx on public.medical_history(user_id);
create index if not exists medical_history_files_user_id_idx on public.medical_history_files(user_id);
create index if not exists medical_history_files_history_id_idx on public.medical_history_files(medical_history_id);

alter table public.medical_history enable row level security;
alter table public.medical_history_files enable row level security;

create trigger update_medical_history_updated_at
before update on public.medical_history
for each row execute function public.update_updated_at_column();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history' and policyname = 'Patients can view own medical history'
  ) then
    create policy "Patients can view own medical history"
      on public.medical_history for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history' and policyname = 'Patients can insert own medical history'
  ) then
    create policy "Patients can insert own medical history"
      on public.medical_history for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history' and policyname = 'Patients can update own medical history'
  ) then
    create policy "Patients can update own medical history"
      on public.medical_history for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history' and policyname = 'Professionals can view assigned patient medical history'
  ) then
    create policy "Professionals can view assigned patient medical history"
      on public.medical_history for select
      to authenticated
      using (public.professional_has_patient_access(user_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history' and policyname = 'Admins can view all medical history'
  ) then
    create policy "Admins can view all medical history"
      on public.medical_history for select
      to authenticated
      using (public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history_files' and policyname = 'Patients can view own medical history files'
  ) then
    create policy "Patients can view own medical history files"
      on public.medical_history_files for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history_files' and policyname = 'Patients can insert own medical history files'
  ) then
    create policy "Patients can insert own medical history files"
      on public.medical_history_files for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history_files' and policyname = 'Patients can delete own medical history files'
  ) then
    create policy "Patients can delete own medical history files"
      on public.medical_history_files for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history_files' and policyname = 'Professionals can view assigned patient medical history files'
  ) then
    create policy "Professionals can view assigned patient medical history files"
      on public.medical_history_files for select
      to authenticated
      using (public.professional_has_patient_access(user_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'medical_history_files' and policyname = 'Admins can view all medical history files'
  ) then
    create policy "Admins can view all medical history files"
      on public.medical_history_files for select
      to authenticated
      using (public.is_admin());
  end if;
end $$;

insert into storage.buckets (id, name, public)
select 'medical-history-documents', 'medical-history-documents', false
where not exists (
  select 1 from storage.buckets where id = 'medical-history-documents'
);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Patients can view own medical history storage files'
  ) then
    create policy "Patients can view own medical history storage files"
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'medical-history-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Patients can upload own medical history storage files'
  ) then
    create policy "Patients can upload own medical history storage files"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'medical-history-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Patients can update own medical history storage files'
  ) then
    create policy "Patients can update own medical history storage files"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'medical-history-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'medical-history-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Patients can delete own medical history storage files'
  ) then
    create policy "Patients can delete own medical history storage files"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'medical-history-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

insert into public.medical_history (
  user_id,
  existing_conditions,
  allergies,
  current_medications,
  onboarding_completed,
  completed_at,
  created_at,
  updated_at
)
select
  pp.user_id,
  case
    when jsonb_typeof(pp.insurance_info->'conditions') = 'array'
      then array(select jsonb_array_elements_text(pp.insurance_info->'conditions'))
    else '{}'::text[]
  end,
  case
    when jsonb_typeof(pp.insurance_info->'allergies') = 'array'
      then array(select jsonb_array_elements_text(pp.insurance_info->'allergies'))
    else '{}'::text[]
  end,
  case
    when jsonb_typeof(pp.insurance_info->'medications') = 'array'
      then array(select jsonb_array_elements_text(pp.insurance_info->'medications'))
    else '{}'::text[]
  end,
  case
    when coalesce(jsonb_array_length(pp.insurance_info->'conditions'), 0) > 0
      or coalesce(jsonb_array_length(pp.insurance_info->'allergies'), 0) > 0
      or coalesce(jsonb_array_length(pp.insurance_info->'medications'), 0) > 0
    then true else false end,
  case
    when coalesce(jsonb_array_length(pp.insurance_info->'conditions'), 0) > 0
      or coalesce(jsonb_array_length(pp.insurance_info->'allergies'), 0) > 0
      or coalesce(jsonb_array_length(pp.insurance_info->'medications'), 0) > 0
    then now() else null end,
  now(),
  now()
from public.patient_profiles pp
where not exists (
  select 1 from public.medical_history mh where mh.user_id = pp.user_id
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient');

  insert into public.profiles (user_id, display_name, role, status)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    v_role,
    'active'
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id, role) do nothing;

  if v_role = 'patient' then
    insert into public.patient_profiles (
      user_id,
      date_of_birth,
      gender,
      phone,
      emergency_contact_name,
      emergency_contact_phone,
      preferred_language
    )
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'date_of_birth', '')::date,
      nullif(new.raw_user_meta_data->>'gender', ''),
      nullif(new.raw_user_meta_data->>'phone', ''),
      nullif(new.raw_user_meta_data->>'emergency_contact_name', ''),
      nullif(new.raw_user_meta_data->>'emergency_contact_phone', ''),
      coalesce(nullif(new.raw_user_meta_data->>'preferred_language', ''), 'en')
    )
    on conflict (user_id) do update set
      date_of_birth = coalesce(excluded.date_of_birth, patient_profiles.date_of_birth),
      gender = coalesce(excluded.gender, patient_profiles.gender),
      phone = coalesce(excluded.phone, patient_profiles.phone),
      emergency_contact_name = coalesce(excluded.emergency_contact_name, patient_profiles.emergency_contact_name),
      emergency_contact_phone = coalesce(excluded.emergency_contact_phone, patient_profiles.emergency_contact_phone),
      preferred_language = coalesce(excluded.preferred_language, patient_profiles.preferred_language),
      updated_at = now();

    insert into public.medical_history (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;