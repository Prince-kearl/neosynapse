export interface TranscriptSegment {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
}

export interface ConsultationTranscriptJson {
  text: string;
  segments: TranscriptSegment[];
  source?: string;
  generated_at: string;
  duration_seconds?: number;
  raw?: unknown;
}

export const extractTranscriptText = (transcriptJson: unknown): string => {
  if (!transcriptJson || typeof transcriptJson !== "object") return "";
  const json = transcriptJson as Record<string, unknown>;
  if (typeof json.text === "string" && json.text.trim()) return json.text.trim();
  if (typeof json.transcript === "string" && json.transcript.trim()) return json.transcript.trim();

  const segments = Array.isArray(json.segments) ? json.segments : [];
  const fromSegments = segments
    .map((segment) => {
      if (!segment || typeof segment !== "object") return "";
      const item = segment as Record<string, unknown>;
      const speaker = typeof item.speaker === "string" ? item.speaker : "Speaker";
      const text = typeof item.text === "string" ? item.text : "";
      return text.trim() ? `${speaker}: ${text.trim()}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return fromSegments.trim();
};

export const normalizeSttResponse = (response: unknown): ConsultationTranscriptJson => {
  const data = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
  const words = Array.isArray(data.words) ? data.words : [];
  const rawSegments = Array.isArray(data.segments) ? data.segments : [];
  const text =
    (typeof data.text === "string" && data.text.trim()) ||
    (typeof data.transcript === "string" && data.transcript.trim()) ||
    rawSegments
      .map((segment) => {
        if (!segment || typeof segment !== "object") return "";
        const item = segment as Record<string, unknown>;
        return typeof item.text === "string" ? item.text.trim() : "";
      })
      .filter(Boolean)
      .join(" ") ||
    words
      .map((word) => {
        if (!word || typeof word !== "object") return "";
        const item = word as Record<string, unknown>;
        return typeof item.text === "string" ? item.text : "";
      })
      .filter(Boolean)
      .join(" ");

  const segments: TranscriptSegment[] =
    rawSegments.length > 0
      ? rawSegments
          .map((segment, index) => {
            if (!segment || typeof segment !== "object") return null;
            const item = segment as Record<string, unknown>;
            const segmentText = typeof item.text === "string" ? item.text.trim() : "";
            if (!segmentText) return null;
            return {
              speaker: typeof item.speaker === "string" ? item.speaker : `Speaker ${index + 1}`,
              text: segmentText,
              start: typeof item.start === "number" ? item.start : undefined,
              end: typeof item.end === "number" ? item.end : undefined,
            };
          })
          .filter(Boolean) as TranscriptSegment[]
      : text.trim()
        ? [{ speaker: "Consultation audio", text: text.trim() }]
        : [];

  return {
    text: text.trim(),
    segments,
    source: "speech-to-text",
    generated_at: new Date().toISOString(),
    duration_seconds: typeof data.audio_duration === "number" ? data.audio_duration : undefined,
    raw: response,
  };
};

export const buildFallbackConsultationArtifacts = (params: {
  transcriptText: string;
  patientName?: string;
  doctorName?: string;
  encounterId: string;
}) => {
  const generatedAt = new Date().toISOString();
  const patientName = params.patientName || "Patient";
  const doctorName = params.doctorName || "Healthcare professional";
  const transcriptText = params.transcriptText.trim();

  const markdown = `# Telemedicine Consultation Report

## Patient
${patientName}

## Clinician
${doctorName}

## Encounter
${params.encounterId}

## Consultation Summary
This draft was generated from the recorded telemedicine transcript. The clinician must review, correct, and approve it before relying on it as a medical record.

## Transcript-Derived Notes
${transcriptText || "No transcript text was available."}

## Assessment
Pending clinician review.

## Plan
Pending clinician review.

## Follow-Up
Pending clinician review.

## Safety Disclaimer
This AI-generated draft is documentation support only and is not a substitute for professional clinical judgement.
`;

  const soap = {
    subjective: transcriptText || "Pending clinician review.",
    objective: "Not documented in the transcript. Add observed examination findings, vitals, and investigation results if available.",
    assessment: "Pending clinician review.",
    plan: "Pending clinician review.",
  };

  return {
    report: {
      title: "Telemedicine Consultation Report",
      status: "draft",
      doctor: doctorName,
      patient: patientName,
      generated_at: generatedAt,
      summary: "AI-generated draft from consultation transcript. Requires clinician review.",
      markdown,
      transcript_excerpt: transcriptText.slice(0, 4000),
    },
    soap_note: soap,
    sop_draft: {
      title: "Consultation SOP / Care Plan Draft",
      steps: [
        "Review the transcript and confirm the chief complaint.",
        "Validate history, red flags, allergies, medications, and relevant medical history.",
        "Document clinical assessment and differential diagnoses.",
        "Confirm treatment plan, patient education, safety-net advice, and follow-up.",
      ],
      disclaimer: "Draft only. Professional review is required.",
    },
  };
};
