import { describe, expect, it } from "vitest";
import {
  buildClinicalNoteMarkdown,
  buildReportJsonFromClinicalNote,
  getClinicalNoteTitle,
} from "@/shared/lib/clinicalNotes";

describe("clinical note helpers", () => {
  it("derives a useful title from clinical note content", () => {
    expect(getClinicalNoteTitle({ chief_complaint: "Persistent cough" })).toBe("Persistent cough");
    expect(getClinicalNoteTitle({})).toBe("Clinical Consultation Note");
  });

  it("renders SOAP-like note markdown for patient-safe reports", () => {
    const markdown = buildClinicalNoteMarkdown(
      {
        soap_note: {
          subjective: "Patient reports cough for three days.",
          objective: "No vitals documented.",
          assessment: "Likely upper respiratory tract infection.",
          plan: "Hydration and review if symptoms worsen.",
        },
      },
      { patientName: "Abena", doctorName: "Dr Mensah", encounterType: "telemedicine" },
    );

    expect(markdown).toContain("Abena");
    expect(markdown).toContain("Likely upper respiratory tract infection.");
    expect(markdown).toContain("Professional Review Notice");
  });

  it("builds finalized medical report JSON from a clinical note", () => {
    const report = buildReportJsonFromClinicalNote({
      noteId: "note-1",
      encounterId: "enc-1",
      finalJson: { title: "Follow-up Note", summary: "Patient improved." },
    });

    expect(report.status).toBe("finalized");
    expect(report.note_id).toBe("note-1");
    expect(report.markdown).toContain("Follow-up Note");
    expect(report.clinical_markdown).toContain("Follow-up Note");
    expect(report.patient_friendly_report).toMatchObject({
      title: "Patient-Friendly Clinical Note Summary",
      summary: "Patient improved.",
    });
  });
});
