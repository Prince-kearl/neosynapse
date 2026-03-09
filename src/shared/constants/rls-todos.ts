/**
 * RLS Policy TODO Tracker
 *
 * This file documents all required RLS policy changes.
 *
 * ═══════════════════════════════════════════════════════════════
 * STATUS: All 9 documented policies have been applied (Phase 5A)
 * ═══════════════════════════════════════════════════════════════
 *
 * Helper functions created:
 *   - is_admin() — SECURITY DEFINER, checks profiles.role = 'admin'
 *   - is_professional() — SECURITY DEFINER, checks profiles.role = 'professional'
 *   - is_patient() — SECURITY DEFINER, checks profiles.role = 'patient'
 *   - professional_has_patient_access(patient_uuid) — checks encounters join
 *   - professional_has_encounter_access(encounter_uuid) — checks encounters join
 *
 * 1. ✅ PROFILES — Admin SELECT all + Professional SELECT assigned patients
 * 2. ✅ PROFESSIONAL_PROFILES — Admin SELECT all + UPDATE verification_status
 * 3. ✅ PATIENT_PROFILES — Professional SELECT for assigned patients + Admin SELECT all
 * 4. ✅ FACILITIES — Admin INSERT, UPDATE, DELETE
 * 5. ✅ TRIAGE_SESSIONS — Professional SELECT for assigned patients
 * 6. ✅ CONSENTS — Patient UPDATE for revoking + Professional SELECT assigned
 * 7. ✅ AUDIT_LOGS — Admin SELECT all
 * 8. ✅ CONSULTATION_ROOMS — Doctor SELECT/UPDATE for assigned rooms
 * 9. ✅ MEDICAL_REPORTS — Professional UPDATE for corrections + SELECT assigned
 *
 * Bonus policies applied:
 *   - Admins can view/update/create all invitations
 *   - Admins can view all appointments and encounters
 */

export const RLS_POLICY_STATUS = {
  profiles: { adminSelectAll: true, professionalSelectAssigned: true },
  professional_profiles: { adminManage: true },
  patient_profiles: { professionalSelectAssigned: true, adminSelectAll: true },
  facilities: { adminCrud: true },
  triage_sessions: { professionalSelectAssigned: true },
  consents: { patientUpdate: true, professionalSelectAssigned: true },
  audit_logs: { adminSelectAll: true },
  consultation_rooms: { doctorAccess: true },
  medical_reports: { professionalUpdate: true, professionalSelectAssigned: true },
  invitations: { adminFullAccess: true },
  appointments: { adminSelectAll: true },
  encounters: { adminSelectAll: true },
} as const;
