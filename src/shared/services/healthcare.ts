/**
 * Healthcare Data Service Layer
 *
 * Typed Supabase query helpers for all healthcare entities.
 * Each function returns raw Supabase responses — wrap in useQuery/useMutation at the component level.
 *
 * ─── RLS POLICY STATUS ─────────────────────────────────────────
 *
 * TABLE                  SELECT    INSERT    UPDATE    DELETE    NOTES
 * ─────────────────────  ────────  ────────  ────────  ────────  ─────────────────────────
 * profiles               ✅ own    ✅ own    ✅ own    ❌        TODO: Admin needs SELECT all
 * patient_profiles       ✅ own    ✅ own    ✅ own    ❌        TODO: Professional needs SELECT for assigned patients
 * professional_profiles  ✅ own    ✅ own    ✅ own    ❌        TODO: Admin needs SELECT all, UPDATE for verification
 * facilities             ✅ public ❌        ❌        ❌        TODO: Admin needs INSERT, UPDATE, DELETE
 * invitations            ✅ all    ✅ own    ✅ own    ❌        OK for now
 * appointments           ✅ own    ✅ patient ✅ own   ❌        OK
 * encounters             ✅ own    ✅ patient ✅ own   ❌        OK
 * triage_sessions        ✅ own    ✅ patient ❌       ❌        TODO: Professional needs SELECT for assigned patients
 * consents               ✅ own    ✅ patient ❌       ❌        TODO: UPDATE for revoking consent
 * transcripts            ✅ via enc ✅ pro   ❌       ❌        OK
 * clinical_notes         ✅ via enc ✅ pro   ✅ pro   ❌        OK
 * medical_reports        ✅ own    ✅ pro/pat ❌      ❌        TODO: UPDATE for corrections
 * audit_logs             ✅ own    ✅ auth   ❌       ❌        TODO: Admin needs SELECT all
 * consultation_rooms     ✅ own    ✅ own    ✅ own   ❌        TODO: Doctor needs SELECT/UPDATE for assigned rooms
 *
 * ────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  Profile, PatientProfile, ProfessionalProfile, Facility,
  Invitation, Appointment, Encounter, TriageSession, Consent,
  Transcript, ClinicalNote, MedicalReport, AuditLog,
} from "@/shared/types/healthcare";

// ─── Profiles ───────────────────────────────────────────────────

export const profileService = {
  /** Get current user's profile */
  getMyProfile: (userId: string) =>
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),

  /** Get profile by user_id */
  getByUserId: (userId: string) =>
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),

  /** Get multiple profiles by user IDs (for display names) */
  getByUserIds: (userIds: string[]) =>
    supabase.from("profiles").select("user_id, display_name, full_name, avatar_url, role").in("user_id", userIds),

  /** Update profile */
  update: (userId: string, data: Partial<Pick<Profile, "display_name" | "full_name" | "avatar_url">>) =>
    supabase.from("profiles").update(data).eq("user_id", userId),

  /** Admin: get all profiles (RLS enforced — only admins see all) */
  getAllProfiles: () =>
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),

  /** Admin: toggle user status */
  updateStatus: (userId: string, status: string) =>
    supabase.from("profiles").update({ status }).eq("user_id", userId),
};

// ─── Patient Profiles ───────────────────────────────────────────

export const patientProfileService = {
  get: (userId: string) =>
    supabase.from("patient_profiles").select("*").eq("user_id", userId).maybeSingle(),

  upsert: (userId: string, data: Record<string, unknown>) =>
    supabase.from("patient_profiles").upsert({ user_id: userId, ...data } as any, { onConflict: "user_id" }),

  /** Professional: get patient profile for assigned patient (RLS enforced) */
  getForAssignedPatient: (patientUserId: string) =>
    supabase.from("patient_profiles").select("*").eq("user_id", patientUserId).maybeSingle(),
};

// ─── Professional Profiles ──────────────────────────────────────

export const professionalProfileService = {
  get: (userId: string) =>
    supabase.from("professional_profiles").select("*").eq("user_id", userId).maybeSingle(),

  upsert: (userId: string, data: Record<string, unknown>) =>
    supabase.from("professional_profiles").upsert({ user_id: userId, ...data } as any, { onConflict: "user_id" }),

  /** Admin: get all professional profiles (RLS enforced) */
  getAll: () =>
    supabase.from("professional_profiles").select("*").order("created_at", { ascending: false }),

  /** Admin: update verification status */
  updateVerification: (userId: string, status: string) =>
    supabase.from("professional_profiles").update({ verification_status: status }).eq("user_id", userId),
};

// ─── Facilities ─────────────────────────────────────────────────

export const facilityService = {
  getAll: () =>
    supabase.from("facilities").select("*").order("name"),

  getById: (id: string) =>
    supabase.from("facilities").select("*").eq("id", id).single(),

  /** Admin: create facility (RLS enforced) */
  create: (data: { name: string; facility_type?: string; location?: string; contact_phone?: string }) =>
    supabase.from("facilities").insert(data),

  /** Admin: update facility */
  update: (id: string, data: Record<string, unknown>) =>
    supabase.from("facilities").update(data).eq("id", id),

  /** Admin: delete facility */
  remove: (id: string) =>
    supabase.from("facilities").delete().eq("id", id),
};

// ─── Invitations ────────────────────────────────────────────────

export const invitationService = {
  getAll: () =>
    supabase.from("invitations").select("*").order("created_at", { ascending: false }),

  getByToken: (token: string) =>
    supabase.from("invitations").select("*").eq("token", token).eq("status", "pending").single(),

  create: (data: { email: string; role: "professional" | "admin"; invited_by: string; facility_id?: string | null }) =>
    supabase.from("invitations").insert({
      email: data.email,
      role: data.role as any,
      invited_by: data.invited_by,
      facility_id: data.facility_id || null,
    }),

  updateStatus: (id: string, status: string) =>
    supabase.from("invitations").update({ status }).eq("id", id),
};

// ─── Appointments ───────────────────────────────────────────────

export const appointmentService = {
  /** Patient: get own appointments */
  getForPatient: (patientId: string) =>
    supabase.from("appointments").select("*").eq("patient_id", patientId).order("scheduled_at", { ascending: false }),

  /** Professional: get assigned appointments */
  getForProfessional: (professionalId: string) =>
    supabase.from("appointments").select("*").eq("professional_id", professionalId).order("scheduled_at", { ascending: false }),

  /** Create appointment (patient) */
  create: (data: {
    patient_id: string;
    professional_id?: string;
    facility_id?: string;
    appointment_type: string;
    reason_for_visit?: string;
    scheduled_at?: string;
  }) =>
    supabase.from("appointments").insert(data),

  /** Update status */
  updateStatus: (id: string, status: string) =>
    supabase.from("appointments").update({ status }).eq("id", id),
};

// ─── Encounters ─────────────────────────────────────────────────

export const encounterService = {
  getForPatient: (patientId: string) =>
    supabase.from("encounters").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),

  getForProfessional: (professionalId: string) =>
    supabase.from("encounters").select("*").eq("professional_id", professionalId).order("created_at", { ascending: false }),

  getById: (id: string) =>
    supabase.from("encounters").select("*").eq("id", id).single(),

  create: (data: {
    patient_id: string;
    professional_id?: string;
    appointment_id?: string;
    encounter_type: string;
  }) =>
    supabase.from("encounters").insert(data),

  updateStatus: (id: string, status: string) =>
    supabase.from("encounters").update({ status }).eq("id", id),
};

// ─── Triage Sessions ────────────────────────────────────────────

export const triageService = {
  getForPatient: (patientId: string) =>
    supabase.from("triage_sessions").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),

  create: (data: {
    patient_id: string;
    inputs_json: Record<string, unknown>;
    result_json?: Record<string, unknown>;
    urgency_level?: string;
  }) =>
    supabase.from("triage_sessions").insert(data as any),

  // TODO: Professional needs SELECT for assigned patients — requires RLS via encounters
};

// ─── Consents ───────────────────────────────────────────────────

export const consentService = {
  getForPatient: (patientId: string) =>
    supabase.from("consents").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),

  create: (data: {
    patient_id: string;
    encounter_id?: string;
    consent_type: string;
    granted: boolean;
  }) =>
    supabase.from("consents").insert(data),

  // TODO: Add UPDATE policy for revoking consent (patient only)
};

// ─── Transcripts ────────────────────────────────────────────────

export const transcriptService = {
  /** Get transcripts via encounter (RLS enforces encounter participant access) */
  getForEncounter: (encounterId: string) =>
    supabase.from("transcripts").select("*").eq("encounter_id", encounterId),

  /** Professional: get all transcripts for their encounters */
  getForProfessional: (professionalId: string) =>
    supabase.from("transcripts")
      .select("*, encounters!inner(professional_id, patient_id, encounter_type, created_at)")
      .eq("encounters.professional_id", professionalId)
      .order("created_at", { ascending: false }),

  create: (data: {
    encounter_id: string;
    transcript_json: Record<string, unknown>;
    speaker_map?: Record<string, unknown>;
  }) =>
    supabase.from("transcripts").insert(data as any),
};

// ─── Clinical Notes ─────────────────────────────────────────────

export const clinicalNoteService = {
  getForEncounter: (encounterId: string) =>
    supabase.from("clinical_notes").select("*").eq("encounter_id", encounterId),

  getForProfessional: (professionalId: string) =>
    supabase.from("clinical_notes")
      .select("*, encounters!inner(professional_id, patient_id, encounter_type)")
      .eq("encounters.professional_id", professionalId)
      .order("created_at", { ascending: false }),

  create: (data: {
    encounter_id: string;
    draft_json: Record<string, unknown>;
  }) =>
    supabase.from("clinical_notes").insert(data as any),

  updateDraft: (id: string, draft_json: Record<string, unknown>) =>
    supabase.from("clinical_notes").update({ draft_json: draft_json as any, status: "draft" }).eq("id", id),

  submitForReview: (id: string) =>
    supabase.from("clinical_notes").update({ status: "review" }).eq("id", id),

  finalize: (id: string, approvedBy: string, final_json: Record<string, unknown>) =>
    supabase.from("clinical_notes").update({
      status: "finalized",
      final_json: final_json as any,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    }).eq("id", id),
};

// ─── Medical Reports ────────────────────────────────────────────

export const medicalReportService = {
  getForPatient: (patientId: string) =>
    supabase.from("medical_reports").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),

  getForEncounter: (encounterId: string) =>
    supabase.from("medical_reports").select("*").eq("encounter_id", encounterId),

  create: (data: {
    patient_id: string;
    encounter_id?: string;
    report_type: string;
    report_json: Record<string, unknown>;
  }) =>
    supabase.from("medical_reports").insert(data as any),

  // TODO: Add UPDATE policy for report corrections
};

// ─── Audit Logs ─────────────────────────────────────────────────

export const auditLogService = {
  /** Get own audit logs (default RLS) */
  getOwn: () =>
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),

  /** Log an action */
  log: (data: {
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
  }) =>
    supabase.from("audit_logs").insert(data as any),

  // TODO: Admin needs SELECT all audit logs — requires RLS policy:
  //   CREATE POLICY "Admins can view all audit logs" ON audit_logs
  //   FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
};
