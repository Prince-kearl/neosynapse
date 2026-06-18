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
});
