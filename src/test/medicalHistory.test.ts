import { describe, expect, it } from "vitest";
import { buildMedicalHistoryContext, buildMedicalHistorySnapshot } from "@/shared/lib/medicalHistory";
import type { MedicalHistory, MedicalHistoryFile, PatientProfile } from "@/shared/types/healthcare";

const history: MedicalHistory = {
  id: "history-1",
  user_id: "patient-1",
  existing_conditions: ["Hypertension"],
  allergies: ["Penicillin"],
  current_medications: ["Amlodipine"],
  past_surgeries: ["Appendectomy"],
  family_medical_history: "Father had stroke.",
  notes: "Prefers morning appointments.",
  onboarding_completed: true,
  privacy_acknowledged_at: "2026-06-18T00:00:00.000Z",
  completed_at: "2026-06-18T00:00:00.000Z",
  last_reviewed_at: "2026-06-18T00:00:00.000Z",
  created_at: "2026-06-18T00:00:00.000Z",
  updated_at: "2026-06-18T00:00:00.000Z",
};

const files: MedicalHistoryFile[] = [
  {
    id: "file-1",
    medical_history_id: "history-1",
    user_id: "patient-1",
    storage_bucket: "medical-history-documents",
    file_path: "patient-1/lab.pdf",
    file_name: "lab.pdf",
    mime_type: "application/pdf",
    file_size: 2048,
    document_type: "lab_result",
    created_at: "2026-06-18T00:00:00.000Z",
  },
];

const profile: PatientProfile = {
  id: "profile-1",
  user_id: "patient-1",
  date_of_birth: "1990-01-01",
  gender: "female",
  preferred_language: "en",
  phone: "+233000000000",
  emergency_contact_name: null,
  emergency_contact_phone: null,
  insurance_info: null,
  created_at: "2026-06-18T00:00:00.000Z",
  updated_at: "2026-06-18T00:00:00.000Z",
};

describe("medical history helpers", () => {
  it("includes saved history and uploaded document names in AI context", () => {
    const context = buildMedicalHistoryContext(history, files);

    expect(context).toContain("Existing conditions: Hypertension");
    expect(context).toContain("Allergies: Penicillin");
    expect(context).toContain("Uploaded medical documents: lab.pdf (lab_result)");
  });

  it("builds appointment snapshots for doctor review", () => {
    const snapshot = buildMedicalHistorySnapshot(history, files, profile);

    expect(snapshot.existing_conditions).toEqual(["Hypertension"]);
    expect(snapshot.allergies).toEqual(["Penicillin"]);
    expect(snapshot.uploaded_documents).toHaveLength(1);
    expect(snapshot.uploaded_documents[0].file_name).toBe("lab.pdf");
    expect(snapshot.patient_profile?.phone).toBe("+233000000000");
    expect(snapshot.summary).toContain("Patient medical history context");
  });
});
