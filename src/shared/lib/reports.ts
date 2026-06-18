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

