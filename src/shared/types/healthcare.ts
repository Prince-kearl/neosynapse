// Healthcare Platform Types

export type UserRole = 'patient' | 'professional' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  full_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  preferred_language: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  insurance_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  profession_type: string | null;
  license_number: string | null;
  specialty: string | null;
  facility_id: string | null;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  name: string;
  facility_type: string | null;
  location: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  facility_id: string | null;
  invited_by: string | null;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string | null;
  facility_id: string | null;
  appointment_type: string;
  reason_for_visit: string | null;
  scheduled_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Encounter {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  professional_id: string | null;
  encounter_type: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriageSession {
  id: string;
  patient_id: string;
  inputs_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
  urgency_level: string | null;
  created_at: string;
}

export interface Consent {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  consent_type: string;
  granted: boolean;
  version: string | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  encounter_id: string;
  transcript_json: Record<string, unknown> | null;
  speaker_map: Record<string, unknown> | null;
  created_at: string;
}

export interface ClinicalNote {
  id: string;
  encounter_id: string;
  draft_json: Record<string, unknown> | null;
  final_json: Record<string, unknown> | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalReport {
  id: string;
  encounter_id: string | null;
  patient_id: string;
  report_type: string;
  report_json: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
