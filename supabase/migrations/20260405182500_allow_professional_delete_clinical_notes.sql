drop policy if exists "Professionals can update their clinical notes" on public.clinical_notes;
create policy "Professionals can update their clinical notes"
  on public.clinical_notes for update
  using (
    exists (
      select 1 from public.encounters e
      where e.id = clinical_notes.encounter_id
        and e.professional_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.encounters e
      where e.id = clinical_notes.encounter_id
        and e.professional_id = auth.uid()
    )
  );

drop policy if exists "Professionals can delete their clinical notes" on public.clinical_notes;
create policy "Professionals can delete their clinical notes"
  on public.clinical_notes for delete
  using (
    exists (
      select 1 from public.encounters e
      where e.id = clinical_notes.encounter_id
        and e.professional_id = auth.uid()
    )
  );
