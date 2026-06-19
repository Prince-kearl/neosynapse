import { describe, expect, it } from "vitest";
import {
  getLinkedNoteId,
  getReportMarkdown,
  getReportSourceLabel,
  getReportStatus,
  getReportTitle,
} from "@/shared/lib/reports";

describe("report helpers", () => {
  it("derives title, status, and links from saved medical report rows", () => {
    const report = {
      report_type: "clinical_summary",
      report_json: {
        title: "Hypertension follow-up",
        status: "finalized",
        note_id: "note-1",
      },
    };

    expect(getReportTitle(report)).toBe("Hypertension follow-up");
    expect(getReportStatus(report)).toBe("finalized");
    expect(getLinkedNoteId(report)).toBe("note-1");
  });

  it("falls back to readable markdown for JSON-only reports", () => {
    const markdown = getReportMarkdown({
      report_type: "lab_result",
      report_json: { summary: "Blood count reviewed." },
    });

    expect(markdown).toContain("# lab_result report");
    expect(markdown).toContain("Blood count reviewed.");
  });

  it("labels known report sources for cross-feature navigation", () => {
    expect(getReportSourceLabel({ report_json: { source: "clinical_note_finalized" } })).toBe("Finalized clinical note");
    expect(getReportSourceLabel({ report_json: { source: "telemedicine_transcript" } })).toBe("Telemedicine transcript");
  });

  it("upgrades legacy symptom triage markdown to the GHIMS clinical report format", () => {
    const legacyReport = {
      report_type: "symptom_triage",
      patient_id: "patient-1",
      created_at: "2026-06-09T12:00:00Z",
      report_json: {
        title: "AI Symptom Triage Report",
        source: "symptom_checker",
        markdown: "# AI Symptom Triage Report\n\nOld output",
        generatedAt: "2026-06-09T12:00:00Z",
        patient: { age: "58", gender: "male" },
        duration: "One week",
        symptoms: ["Frequent urination", "Extreme thirst", "Blurred vision", "Fatigue"],
        urgency: "urgent",
        summary: "Symptoms suggest significant hyperglycemia.",
        recommended_action: "Attend urgent medical review.",
        possible_conditions: [
          {
            name: "Uncontrolled Type 2 Diabetes Mellitus",
            likelihood: "high",
            confidence: 92,
            reason: "Symptoms and known diabetes support this concern.",
          },
        ],
        warning_signs: ["Confusion"],
        follow_up_questions: ["What is the current blood sugar reading?"],
      },
    };

    const markdown = getReportMarkdown(legacyReport);

    expect(getReportTitle(legacyReport)).toBe("Clinical Assessment and Triage Report");
    expect(markdown).toContain("Achimota Hospital");
    expect(markdown).toContain("Ghana Health Information Management System (GHIMS)");
    expect(markdown).toContain("Clinical Assessment and Triage Report");
    expect(markdown).toContain("Uncontrolled Type 2 Diabetes Mellitus");
    expect(markdown).not.toContain("# AI Symptom Triage Report");
  });
});
