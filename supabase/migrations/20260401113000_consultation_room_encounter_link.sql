-- Link consultation rooms directly to encounters for strict telemedicine matching

alter table public.consultation_rooms
  add column if not exists encounter_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'consultation_rooms_encounter_id_fkey'
  ) then
    alter table public.consultation_rooms
      add constraint consultation_rooms_encounter_id_fkey
      foreign key (encounter_id)
      references public.encounters(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_consultation_rooms_encounter_id
  on public.consultation_rooms(encounter_id);
