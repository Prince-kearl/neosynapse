-- Fix WebRTC signaling RLS to avoid unsafe doctor_id::uuid casts that can break ICE inserts.
-- Use text comparison against auth.uid()::text instead.

-- consultation_rooms policies
DROP POLICY IF EXISTS "Doctors can view assigned rooms" ON public.consultation_rooms;
CREATE POLICY "Doctors can view assigned rooms"
  ON public.consultation_rooms FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Doctors can update assigned rooms" ON public.consultation_rooms;
CREATE POLICY "Doctors can update assigned rooms"
  ON public.consultation_rooms FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid()::text OR public.is_admin())
  WITH CHECK (doctor_id = auth.uid()::text OR public.is_admin());

-- Keep patient room ownership path explicitly available
DROP POLICY IF EXISTS "Users can view their own rooms" ON public.consultation_rooms;
CREATE POLICY "Users can view their own rooms"
  ON public.consultation_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own rooms" ON public.consultation_rooms;
CREATE POLICY "Users can update their own rooms"
  ON public.consultation_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin())
  WITH CHECK (auth.uid() = created_by OR public.is_admin());

-- ice_candidates policies
DROP POLICY IF EXISTS "Users can insert candidates for their rooms" ON public.ice_candidates;
CREATE POLICY "Users can insert candidates for their rooms"
  ON public.ice_candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.consultation_rooms
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND (consultation_rooms.created_by = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can view candidates for their rooms" ON public.ice_candidates;
CREATE POLICY "Users can view candidates for their rooms"
  ON public.ice_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultation_rooms
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND (consultation_rooms.created_by = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Doctors can insert candidates for their rooms" ON public.ice_candidates;
CREATE POLICY "Doctors can insert candidates for their rooms"
  ON public.ice_candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.consultation_rooms
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND (consultation_rooms.doctor_id = auth.uid()::text OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Doctors can view candidates for their rooms" ON public.ice_candidates;
CREATE POLICY "Doctors can view candidates for their rooms"
  ON public.ice_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultation_rooms
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND (consultation_rooms.doctor_id = auth.uid()::text OR public.is_admin())
    )
  );
