// Healthcare Platform Types
// Aligned with Supabase schema — see src/integrations/supabase/types.ts for DB source of truth

export type UserRole = 'patient' | 'professional' | 'admin';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type EncounterStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ClinicalNoteStatus = 'draft' | 'review' | 'finalized';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type ConsentType = 'recording' | 'data_sharing' | 'telemedicine' | 'treatment';

// ─── Core Profile ───────────────────────────────────────────────
export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
  role: UserRole;
  status: string;
  settings_json: Record<string, unknown> | null;
  // Legacy fields still in DB schema
  default_budget: number | null;
  diet_preferences: string[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Patient Profile ────────────────────────────────────────────
export interface PatientProfile {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  preferred_language: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  insurance_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Professional Profile ───────────────────────────────────────
export interface ProfessionalProfile {
  id: string;
  user_id: string;
  profession_type: string | null;
  license_number: string | null;
  specialty: string | null;
  facility_id: string | null;
  verification_status: VerificationStatus;
  settings_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Facility ───────────────────────────────────────────────────
export interface Facility {
  id: string;
  name: string;
  facility_type: string | null;
  location: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Invitation ─────────────────────────────────────────────────
export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  facility_id: string | null;
  invited_by: string | null;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
}

// ─── Appointment ────────────────────────────────────────────────
export interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string | null;
  facility_id: string | null;
  appointment_type: string;
  reason_for_visit: string | null;
  scheduled_at: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

// ─── Encounter ──────────────────────────────────────────────────
export interface Encounter {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  professional_id: string | null;
  encounter_type: string;
  status: EncounterStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Triage Session ─────────────────────────────────────────────
export interface TriageSession {
  id: string;
  patient_id: string;
  inputs_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
  urgency_level: UrgencyLevel | null;
  created_at: string;
}

// ─── Consent ────────────────────────────────────────────────────
export interface Consent {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  consent_type: ConsentType;
  granted: boolean;
  version: string | null;
  created_at: string;
}

// ─── Transcript ─────────────────────────────────────────────────
export interface Transcript {
  id: string;
  encounter_id: string;
  transcript_json: Record<string, unknown> | null;
  speaker_map: Record<string, unknown> | null;
  created_at: string;
}

// ─── Clinical Note ──────────────────────────────────────────────
export interface ClinicalNote {
  id: string;
  encounter_id: string;
  draft_json: Record<string, unknown> | null;
  final_json: Record<string, unknown> | null;
  status: ClinicalNoteStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Medical Report ─────────────────────────────────────────────
export interface MedicalReport {
  id: string;
  encounter_id: string | null;
  patient_id: string;
  report_type: string;
  report_json: Record<string, unknown> | null;
  created_at: string;
}

// ─── Audit Log ──────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Consultation Room (WebRTC) ─────────────────────────────────
export interface ConsultationRoom {
  id: string;
  created_by: string;
  doctor_id: string;
  status: string;
  consent_recording: boolean;
  offer: Record<string, unknown> | null;
  answer: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Joined / Enriched types for UI ─────────────────────────────
export interface EncounterWithPatient extends Encounter {
  patient_name?: string;
  patient_avatar?: string | null;
}

export interface AppointmentWithProfessional extends Appointment {
  professional_name?: string;
  facility_name?: string;
}

export interface ClinicalNoteWithContext extends ClinicalNote {
  patient_id?: string;
  patient_name?: string;
  encounter_type?: string;
}

export interface TranscriptWithContext extends Transcript {
  patient_id?: string;
  patient_name?: string;
  encounter_type?: string;
}
