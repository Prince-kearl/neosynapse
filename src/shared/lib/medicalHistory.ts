import type { MedicalHistory, MedicalHistoryFile, PatientProfile } from "@/shared/types/healthcare";
import type { PatientProfileMeta } from "@/shared/lib/patientSettings";

export type MedicalHistorySnapshot = {
  captured_at: string;
  summary: string | null;
  existing_conditions: string[];
  allergies: string[];
  current_medications: string[];
  past_surgeries: string[];
  family_medical_history: string | null;
  notes: string | null;
  uploaded_documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    mime_type: string | null;
    file_size: number | null;
    created_at: string;
  }>;
  patient_profile?: {
    date_of_birth: string | null;
    gender: string | null;
    preferred_language: string | null;
    phone: string | null;
  };
  profile_settings?: Pick<PatientProfileMeta, "saved_locations" | "payment_insurance" | "privacy_security_settings">;
};

export function parseListInput(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyListInput(value?: string[] | null): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

export function hasMedicalHistoryContent(history?: MedicalHistory | null): boolean {
  if (!history) return false;
  return (
    history.existing_conditions.length > 0 ||
    history.allergies.length > 0 ||
    history.current_medications.length > 0 ||
    history.past_surgeries.length > 0 ||
    !!history.family_medical_history?.trim() ||
    !!history.notes?.trim()
  );
}

export function buildMedicalHistoryContext(
  history?: MedicalHistory | null,
  files?: MedicalHistoryFile[] | null
): string | null {
  if (!history && (!files || files.length === 0)) return null;

  const lines: string[] = [];

  if (history) {
    if (history.existing_conditions.length > 0) {
      lines.push(`Existing conditions: ${history.existing_conditions.join(", ")}`);
    }
    if (history.allergies.length > 0) {
      lines.push(`Allergies: ${history.allergies.join(", ")}`);
    }
    if (history.current_medications.length > 0) {
      lines.push(`Current medications: ${history.current_medications.join(", ")}`);
    }
    if (history.past_surgeries.length > 0) {
      lines.push(`Past surgeries: ${history.past_surgeries.join(", ")}`);
    }
    if (history.family_medical_history?.trim()) {
      lines.push(`Family medical history: ${history.family_medical_history.trim()}`);
    }
    if (history.notes?.trim()) {
      lines.push(`Additional medical notes: ${history.notes.trim()}`);
    }
  }

  if (files && files.length > 0) {
    lines.push(
      `Uploaded medical documents: ${files
        .map((file) => `${file.file_name}${file.document_type ? ` (${file.document_type})` : ""}`)
        .join(", ")}`
    );
  }

  if (lines.length === 0) return null;

  return `Patient medical history context:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function buildMedicalHistorySnapshot(
  history?: MedicalHistory | null,
  files?: MedicalHistoryFile[] | null,
  profile?: PatientProfile | null,
  profileSettings?: PatientProfileMeta | null
): MedicalHistorySnapshot {
  const uploadedDocuments = (files || []).map((file) => ({
    id: file.id,
    file_name: file.file_name,
    document_type: file.document_type,
    mime_type: file.mime_type,
    file_size: file.file_size,
    created_at: file.created_at,
  }));

  const summary = buildMedicalHistoryContext(history, files);

  return {
    captured_at: new Date().toISOString(),
    summary,
    existing_conditions: history?.existing_conditions || [],
    allergies: history?.allergies || [],
    current_medications: history?.current_medications || [],
    past_surgeries: history?.past_surgeries || [],
    family_medical_history: history?.family_medical_history || null,
    notes: history?.notes || null,
    uploaded_documents: uploadedDocuments,
    ...(profile
      ? {
          patient_profile: {
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            preferred_language: profile.preferred_language,
            phone: profile.phone,
          },
        }
      : {}),
    ...(profileSettings
      ? {
          profile_settings: {
            saved_locations: profileSettings.saved_locations,
            payment_insurance: profileSettings.payment_insurance,
            privacy_security_settings: profileSettings.privacy_security_settings,
          },
        }
      : {}),
  };
}
