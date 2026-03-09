
-- Fix ICE candidates RLS: allow doctors to insert and view candidates for rooms assigned to them
CREATE POLICY "Doctors can insert candidates for their rooms"
ON public.ice_candidates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM consultation_rooms
    WHERE consultation_rooms.id = ice_candidates.room_id
      AND consultation_rooms.doctor_id = (auth.uid())::text
  )
);

CREATE POLICY "Doctors can view candidates for their rooms"
ON public.ice_candidates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM consultation_rooms
    WHERE consultation_rooms.id = ice_candidates.room_id
      AND consultation_rooms.doctor_id = (auth.uid())::text
  )
);
