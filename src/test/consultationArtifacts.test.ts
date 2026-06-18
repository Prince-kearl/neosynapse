import { describe, expect, it } from "vitest";
import {
  buildFallbackConsultationArtifacts,
  extractTranscriptText,
  normalizeSttResponse,
} from "@/shared/lib/consultationArtifacts";

describe("consultation artifacts", () => {
  it("extracts readable text from transcript segments", () => {
    expect(
      extractTranscriptText({
        segments: [
          { speaker: "Patient", text: "I have chest discomfort." },
          { speaker: "Doctor", text: "How long has this been happening?" },
        ],
      }),
    ).toContain("Patient: I have chest discomfort.");
  });

  it("normalizes speech-to-text responses into saved transcript JSON", () => {
    const normalized = normalizeSttResponse({
      text: "Patient reports fever and cough.",
      audio_duration: 42,
    });

    expect(normalized.text).toBe("Patient reports fever and cough.");
    expect(normalized.segments[0].speaker).toBe("Consultation audio");
    expect(normalized.duration_seconds).toBe(42);
  });

  it("builds conservative fallback report, SOAP note, and SOP draft", () => {
    const artifacts = buildFallbackConsultationArtifacts({
      transcriptText: "Patient reports headache for two days.",
      patientName: "Abena",
      doctorName: "Dr Mensah",
      encounterId: "enc-1",
    });

    expect(artifacts.report.markdown).toContain("Telemedicine Consultation Report");
    expect(artifacts.soap_note.subjective).toContain("headache");
    expect(artifacts.sop_draft.steps.length).toBeGreaterThan(0);
  });
});
