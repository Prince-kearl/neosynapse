-- Update RLS policies to grant admin full access across all tables
-- This migration adds admin access to all existing policies

-- ═══════════════════════════════════════════════════════════════
-- PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policy to include admin access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Update admin policy to include all operations
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- PATIENT_PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Patients can view own" ON public.patient_profiles;
CREATE POLICY "Patients can view own"
  ON public.patient_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Professionals can view assigned patients" ON public.patient_profiles;
CREATE POLICY "Professionals can view assigned patients"
  ON public.patient_profiles FOR SELECT
  TO authenticated
  USING (public.professional_has_patient_access(user_id) OR public.is_admin());

-- Add admin full access
CREATE POLICY "Admins can manage all patient profiles"
  ON public.patient_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- PROFESSIONAL_PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Admins can view all professional profiles" ON public.professional_profiles;
CREATE POLICY "Admins can manage all professional profiles"
  ON public.professional_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add professional self-access with admin override
CREATE POLICY "Professionals can manage own profile"
  ON public.professional_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- APPOINTMENTS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Patients/Professionals view own appointments" ON public.appointments;
CREATE POLICY "Patients/Professionals view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING ((auth.uid() = patient_id OR auth.uid() = professional_id) OR public.is_admin());

DROP POLICY IF EXISTS "Patients create own appointments" ON public.appointments;
CREATE POLICY "Patients create own appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = patient_id) OR public.is_admin());

DROP POLICY IF EXISTS "Parties can update own appointments" ON public.appointments;
CREATE POLICY "Parties can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING ((auth.uid() = patient_id OR auth.uid() = professional_id) OR public.is_admin())
  WITH CHECK ((auth.uid() = patient_id OR auth.uid() = professional_id) OR public.is_admin());

-- Add admin delete access
CREATE POLICY "Admins can delete appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- ENCOUNTERS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Patients/Professionals view own encounters" ON public.encounters;
CREATE POLICY "Patients/Professionals view own encounters"
  ON public.encounters FOR SELECT
  TO authenticated
  USING ((auth.uid() = patient_id OR auth.uid() = professional_id) OR public.is_admin());

-- Add admin full access
CREATE POLICY "Admins can manage all encounters"
  ON public.encounters FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- INVITATIONS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access (they already have admin access, but ensure all operations)
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;

CREATE POLICY "Admins can manage all invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- FACILITIES TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies (already admin-only, but ensure all operations)
DROP POLICY IF EXISTS "Admins can insert facilities" ON public.facilities;
DROP POLICY IF EXISTS "Admins can update facilities" ON public.facilities;
DROP POLICY IF EXISTS "Admins can delete facilities" ON public.facilities;

CREATE POLICY "Admins can manage all facilities"
  ON public.facilities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- CLINICAL_NOTES TABLE
-- ═══════════════════════════════════════════════════════════════

-- Add admin access to existing policies
CREATE POLICY "Admins can manage all clinical notes"
  ON public.clinical_notes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- MEDICAL_REPORTS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Professionals can update own reports" ON public.medical_reports;
CREATE POLICY "Professionals can update own reports"
  ON public.medical_reports FOR UPDATE
  TO authenticated
  USING (public.professional_has_encounter_access(encounter_id) OR public.is_admin())
  WITH CHECK (public.professional_has_encounter_access(encounter_id) OR public.is_admin());

DROP POLICY IF EXISTS "Professionals can view assigned patient reports" ON public.medical_reports;
CREATE POLICY "Professionals can view assigned patient reports"
  ON public.medical_reports FOR SELECT
  TO authenticated
  USING (public.professional_has_encounter_access(encounter_id) OR public.is_admin());

-- Add admin insert/delete
CREATE POLICY "Admins can manage all medical reports"
  ON public.medical_reports FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- AUDIT_LOGS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policy (already admin-only, but ensure all operations)
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can manage all audit logs"
  ON public.audit_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- TRANSCRIPTS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Add admin access
CREATE POLICY "Admins can manage all transcripts"
  ON public.transcripts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- TRIAGE_SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policy to include admin access
DROP POLICY IF EXISTS "Professionals can view assigned triage sessions" ON public.triage_sessions;
CREATE POLICY "Professionals can view assigned triage sessions"
  ON public.triage_sessions FOR SELECT
  TO authenticated
  USING (public.professional_has_patient_access(patient_id) OR public.is_admin());

-- Add admin full access
CREATE POLICY "Admins can manage all triage sessions"
  ON public.triage_sessions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- CONSULTATION_ROOMS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Users can create own rooms" ON public.consultation_rooms;
CREATE POLICY "Users can create own rooms"
  ON public.consultation_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Users can view own rooms" ON public.consultation_rooms;
CREATE POLICY "Users can view own rooms"
  ON public.consultation_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Doctors can view assigned rooms" ON public.consultation_rooms;
CREATE POLICY "Doctors can view assigned rooms"
  ON public.consultation_rooms FOR SELECT
  TO authenticated
  USING (doctor_id::uuid = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Doctors can update assigned rooms" ON public.consultation_rooms;
CREATE POLICY "Doctors can update assigned rooms"
  ON public.consultation_rooms FOR UPDATE
  TO authenticated
  USING (doctor_id::uuid = auth.uid() OR public.is_admin())
  WITH CHECK (doctor_id::uuid = auth.uid() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- ICE_CANDIDATES TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Doctors can insert candidates for their rooms" ON public.ice_candidates;
CREATE POLICY "Doctors can insert candidates for their rooms"
  ON public.ice_candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultation_rooms
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND (consultation_rooms.doctor_id::uuid = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Doctors can view candidates for their rooms" ON public.ice_candidates;
CREATE POLICY "Doctors can view candidates for their rooms"
  ON public.ice_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultation_rooms
      WHERE consultation_rooms.id = ice_candidates.room_id
        AND (consultation_rooms.doctor_id::uuid = auth.uid() OR public.is_admin())
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- CONSENTS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Update existing policies to include admin access
DROP POLICY IF EXISTS "Patients can update own consents" ON public.consents;
CREATE POLICY "Patients can update own consents"
  ON public.consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id OR public.is_admin())
  WITH CHECK (auth.uid() = patient_id OR public.is_admin());

DROP POLICY IF EXISTS "Professionals can view assigned patient consents" ON public.consents;
CREATE POLICY "Professionals can view assigned patient consents"
  ON public.consents FOR SELECT
  TO authenticated
  USING (public.professional_has_patient_access(patient_id) OR public.is_admin());

-- Add admin full access
CREATE POLICY "Admins can manage all consents"
  ON public.consents FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());