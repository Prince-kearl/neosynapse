
-- ═══════════════════════════════════════════════════════════════
-- Phase 5A: Healthcare RLS Helper Functions + All Missing Policies
-- ═══════════════════════════════════════════════════════════════

-- ─── Helper Functions (SECURITY DEFINER to avoid recursion) ───

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_professional()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'professional'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_patient()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'patient'
  );
$$;

CREATE OR REPLACE FUNCTION public.professional_has_patient_access(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.encounters
    WHERE professional_id = auth.uid()
      AND patient_id = p_patient_id
  );
$$;

CREATE OR REPLACE FUNCTION public.professional_has_encounter_access(p_encounter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.encounters
    WHERE id = p_encounter_id
      AND professional_id = auth.uid()
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. PROFILES — Admin SELECT all
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Professionals can view profiles of their assigned patients (name lookup)
CREATE POLICY "Professionals can view assigned patient profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_professional()
    AND public.professional_has_patient_access(profiles.user_id)
  );

-- ═══════════════════════════════════════════════════════════════
-- 2. PROFESSIONAL_PROFILES — Admin SELECT all + UPDATE
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Admins can view all professional profiles"
  ON public.professional_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update professional profiles"
  ON public.professional_profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 3. PATIENT_PROFILES — Professional SELECT for assigned patients
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Professionals can view assigned patient profiles"
  ON public.patient_profiles FOR SELECT
  TO authenticated
  USING (public.professional_has_patient_access(patient_profiles.user_id));

-- Admin can also view all patient profiles
CREATE POLICY "Admins can view all patient profiles"
  ON public.patient_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 4. FACILITIES — Admin full CRUD (INSERT, UPDATE, DELETE)
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Admins can insert facilities"
  ON public.facilities FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update facilities"
  ON public.facilities FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete facilities"
  ON public.facilities FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 5. TRIAGE_SESSIONS — Professional SELECT for assigned patients
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Professionals can view assigned triage sessions"
  ON public.triage_sessions FOR SELECT
  TO authenticated
  USING (public.professional_has_patient_access(triage_sessions.patient_id));

-- ═══════════════════════════════════════════════════════════════
-- 6. CONSENTS — Patient UPDATE for revoking
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Patients can update own consents"
  ON public.consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id);

-- Professionals can view consents for assigned patients
CREATE POLICY "Professionals can view assigned patient consents"
  ON public.consents FOR SELECT
  TO authenticated
  USING (public.professional_has_patient_access(consents.patient_id));

-- ═══════════════════════════════════════════════════════════════
-- 7. AUDIT_LOGS — Admin SELECT all
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 8. CONSULTATION_ROOMS — Doctor access
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Doctors can view assigned rooms"
  ON public.consultation_rooms FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid()::text);

CREATE POLICY "Doctors can update assigned rooms"
  ON public.consultation_rooms FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- 9. MEDICAL_REPORTS — Professional UPDATE for corrections
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Professionals can update own reports"
  ON public.medical_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.encounters
      WHERE encounters.id = medical_reports.encounter_id
        AND encounters.professional_id = auth.uid()
    )
  );

-- Professionals can also SELECT reports for their encounters
CREATE POLICY "Professionals can view assigned patient reports"
  ON public.medical_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.encounters
      WHERE encounters.id = medical_reports.encounter_id
        AND encounters.professional_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- BONUS: Admin SELECT on invitations (they can already via invited_by,
-- but admins need to see all invitations)
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Admins can view all invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can update any invitation (revoke etc.)
CREATE POLICY "Admins can update invitations"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Admins can create invitations on behalf of others
CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- Admin access to encounters, appointments for oversight
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all encounters"
  ON public.encounters FOR SELECT
  TO authenticated
  USING (public.is_admin());
