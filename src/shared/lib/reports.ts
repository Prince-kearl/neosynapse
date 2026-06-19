import { buildClinicalAssessmentReport, type ClinicalReportResult } from "@/shared/lib/clinicalReport";

export const asReportRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const reportText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const reportArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];

export const toReportTitleCase = (value: string): string =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatReportDateTime = (value: unknown): string => {
  if (typeof value !== "string") return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getReportJson = (report: unknown): Record<string, unknown> => {
  const row = asReportRecord(report);
  return asReportRecord(row.report_json);
};

export const getReportTitle = (report: unknown): string => {
  const row = asReportRecord(report);
  const json = getReportJson(report);
  if (isLegacySymptomReport(report)) return "Clinical Assessment and Triage Report";
  return reportText(json.title) || `${reportText(row.report_type) || "medical"} report`;
};

export const getReportStatus = (report: unknown): string => {
  const status = reportText(getReportJson(report).status);
  return status || "finalized";
};

export const getReportSummary = (report: unknown): string =>
  reportText(getReportJson(report).summary) || "No summary is available for this report yet.";

export const getReportRecommendedAction = (report: unknown): string =>
  reportText(getReportJson(report).recommended_action) || "No recommended next step was provided.";

export const getReportMarkdown = (report: unknown): string => {
  const json = getReportJson(report);
  const clinicalMarkdown = reportText(json.clinical_markdown);
  if (clinicalMarkdown) return clinicalMarkdown;

  const upgradedLegacyMarkdown = buildLegacySymptomClinicalMarkdown(report);
  if (upgradedLegacyMarkdown) return upgradedLegacyMarkdown;

  const markdown = reportText(json.markdown);
  if (markdown) return markdown;
  return `# ${getReportTitle(report)}\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``;
};

export const getReportSourceLabel = (report: unknown): string => {
  const source = reportText(getReportJson(report).source);
  if (source === "clinical_note_finalized") return "Finalized clinical note";
  if (source === "telemedicine_transcript") return "Telemedicine transcript";
  if (source === "symptom_checker") return "Symptom checker";
  if (source === "ai_assistant") return "AI assistant";
  return source ? toReportTitleCase(source) : "Medical report";
};

export const getReportFileName = (report: unknown): string =>
  `${getReportTitle(report).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "medical-report"}-${new Date(reportText(asReportRecord(report).created_at) || Date.now()).toISOString().slice(0, 10)}.pdf`;

export const getLinkedNoteId = (report: unknown): string | null => {
  const value = getReportJson(report).note_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const getLinkedTranscriptId = (report: unknown): string | null => {
  const value = getReportJson(report).transcript_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const isReportLinkedToNote = (report: unknown, noteId: string): boolean => getLinkedNoteId(report) === noteId;

function isLegacySymptomReport(report: unknown): boolean {
  const row = asReportRecord(report);
  const json = getReportJson(report);
  const title = reportText(json.title).toLowerCase();
  const source = reportText(json.source);
  const reportType = reportText(row.report_type);

  return (
    title === "ai symptom triage report" ||
    ((source === "symptom_checker" || reportType === "symptom_triage") && !reportText(json.clinical_markdown))
  );
}

function normalizeCondition(value: unknown) {
  const condition = asReportRecord(value);
  return {
    name: reportText(condition.name) || "Condition under review",
    likelihood: reportText(condition.likelihood) || "unknown",
    confidence: typeof condition.confidence === "number" ? condition.confidence : undefined,
    reason: reportText(condition.reason) || reportText(condition.definition) || "Supporting evidence was not recorded.",
    definition: reportText(condition.definition) || undefined,
    causes: reportText(condition.causes) || undefined,
    symptoms: reportText(condition.symptoms) || undefined,
    treatments: reportText(condition.treatments) || undefined,
    first_aid: reportText(condition.first_aid) || undefined,
    sources: reportArray(condition.sources),
  };
}

function buildLegacySymptomClinicalMarkdown(report: unknown): string | null {
  if (!isLegacySymptomReport(report)) return null;

  const row = asReportRecord(report);
  const json = getReportJson(report);
  const patient = asReportRecord(json.patient);
  const possibleConditions = Array.isArray(json.possible_conditions)
    ? json.possible_conditions.map(normalizeCondition)
    : [];
  const generatedAt = reportText(json.generatedAt) || reportText(row.created_at);
  const parsedGeneratedAt = generatedAt ? new Date(generatedAt) : new Date();

  const result: ClinicalReportResult = {
    urgency: (["non-urgent", "needs-attention", "urgent", "emergency"].includes(reportText(json.urgency))
      ? reportText(json.urgency)
      : "needs-attention") as ClinicalReportResult["urgency"],
    summary: getReportSummary(report),
    possible_conditions: possibleConditions,
    recommended_action: getReportRecommendedAction(report),
    urgency_reason: reportText(json.urgency_reason) || undefined,
    risk_factors: reportArray(json.risk_factors),
    medication_considerations: reportArray(json.medication_considerations),
    medical_history_impact: reportArray(json.medical_history_impact),
    questions: reportArray(json.follow_up_questions).length ? reportArray(json.follow_up_questions) : reportArray(json.questions),
    warning_signs: reportArray(json.warning_signs),
    fallback_mode: json.fallback_mode === true,
  };

  return buildClinicalAssessmentReport({
    result,
    patientId: reportText(row.patient_id) || undefined,
    patientName: reportText(patient.full_name) || undefined,
    age: reportText(patient.age),
    gender: reportText(patient.gender),
    selectedSymptoms: reportArray(json.symptoms),
    duration: reportText(json.duration),
    generatedAt: Number.isNaN(parsedGeneratedAt.getTime()) ? new Date() : parsedGeneratedAt,
  }).clinicalMarkdown;
}
