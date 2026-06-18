-- Allow patients to join consultation rooms that were created by a doctor
-- for an encounter assigned to that patient.

CREATE POLICY "Patients can view rooms for their encounters"
  ON public.consultation_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.encounters
      WHERE encounters.id = consultation_rooms.encounter_id
        AND encounters.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can answer rooms for their encounters"
  ON public.consultation_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.encounters
      WHERE encounters.id = consultation_rooms.encounter_id
        AND encounters.patient_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.encounters
      WHERE encounters.id = consultation_rooms.encounter_id
        AND encounters.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view ICE candidates for their encounter rooms"
  ON public.ice_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultation_rooms
      JOIN public.encounters ON encounters.id = consultation_rooms.encounter_id
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND encounters.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can add ICE candidates for their encounter rooms"
  ON public.ice_candidates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.consultation_rooms
      JOIN public.encounters ON encounters.id = consultation_rooms.encounter_id
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND encounters.patient_id = auth.uid()
    )
  );
