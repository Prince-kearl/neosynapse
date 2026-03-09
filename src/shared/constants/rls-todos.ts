/**
 * RLS Policy TODO Tracker
 *
 * This file documents all required RLS policy changes that must be
 * applied via database migrations before production deployment.
 *
 * ═══════════════════════════════════════════════════════════════
 * CRITICAL: These policies are required for full RBAC enforcement
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. PROFILES — Admin SELECT all
 *    Currently: Users can only view own profile
 *    Needed: Admins must view all profiles for user management
 *    SQL:
 *      CREATE POLICY "Admins can view all profiles" ON profiles
 *      FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
 *
 * 2. PROFESSIONAL_PROFILES — Admin SELECT all + UPDATE verification_status
 *    Currently: Professionals can only view/update own
 *    Needed: Admins must verify professionals
 *    SQL:
 *      CREATE POLICY "Admins can manage professional profiles" ON professional_profiles
 *      FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');
 *
 * 3. PATIENT_PROFILES — Professional SELECT for assigned patients
 *    Currently: Patients can only view own
 *    Needed: Professionals see profiles of patients in their encounters
 *    SQL:
 *      CREATE POLICY "Professionals can view assigned patient profiles" ON patient_profiles
 *      FOR SELECT USING (
 *        EXISTS (
 *          SELECT 1 FROM encounters
 *          WHERE encounters.patient_id = patient_profiles.user_id
 *            AND encounters.professional_id = auth.uid()
 *        )
 *      );
 *
 * 4. FACILITIES — Admin full CRUD
 *    Currently: Public SELECT only
 *    Needed: Admins must create, update, and delete facilities
 *    SQL:
 *      CREATE POLICY "Admins can manage facilities" ON facilities
 *      FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');
 *
 * 5. TRIAGE_SESSIONS — Professional SELECT for assigned patients
 *    Currently: Patients can only view own
 *    Needed: Professionals see triage results for their patients
 *    SQL:
 *      CREATE POLICY "Professionals can view assigned triage sessions" ON triage_sessions
 *      FOR SELECT USING (
 *        EXISTS (
 *          SELECT 1 FROM encounters
 *          WHERE encounters.patient_id = triage_sessions.patient_id
 *            AND encounters.professional_id = auth.uid()
 *        )
 *      );
 *
 * 6. CONSENTS — Patient UPDATE for revoking
 *    Currently: INSERT only
 *    Needed: Patients must be able to revoke consent
 *    SQL:
 *      CREATE POLICY "Patients can update own consents" ON consents
 *      FOR UPDATE USING (auth.uid() = patient_id);
 *
 * 7. AUDIT_LOGS — Admin SELECT all
 *    Currently: Users can only view own
 *    Needed: Admins must view complete audit trail
 *    SQL:
 *      CREATE POLICY "Admins can view all audit logs" ON audit_logs
 *      FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
 *
 * 8. CONSULTATION_ROOMS — Doctor access
 *    Currently: Only room creator can view/update
 *    Needed: Assigned doctor must also access rooms
 *    SQL:
 *      CREATE POLICY "Doctors can view assigned rooms" ON consultation_rooms
 *      FOR SELECT USING (doctor_id = auth.uid()::text OR created_by = auth.uid());
 *      CREATE POLICY "Doctors can update assigned rooms" ON consultation_rooms
 *      FOR UPDATE USING (doctor_id = auth.uid()::text OR created_by = auth.uid());
 *
 * 9. MEDICAL_REPORTS — UPDATE policy for corrections
 *    Currently: No UPDATE allowed
 *    Needed: Professional who created it should be able to amend
 *    SQL:
 *      CREATE POLICY "Professionals can update own reports" ON medical_reports
 *      FOR UPDATE USING (
 *        EXISTS (
 *          SELECT 1 FROM encounters
 *          WHERE encounters.id = medical_reports.encounter_id
 *            AND encounters.professional_id = auth.uid()
 *        )
 *      );
 *
 * ═══════════════════════════════════════════════════════════════
 * NOTE: All admin policies use get_user_role() which is a
 * SECURITY DEFINER function to avoid infinite recursion.
 * ═══════════════════════════════════════════════════════════════
 */

export const RLS_POLICY_STATUS = {
  profiles: { adminSelectAll: false },
  professional_profiles: { adminManage: false },
  patient_profiles: { professionalSelectAssigned: false },
  facilities: { adminCrud: false },
  triage_sessions: { professionalSelectAssigned: false },
  consents: { patientUpdate: false },
  audit_logs: { adminSelectAll: false },
  consultation_rooms: { doctorAccess: false },
  medical_reports: { professionalUpdate: false },
} as const;
