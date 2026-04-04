import type { MedicalHistory, MedicalHistoryFile } from "@/shared/types/healthcare";

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