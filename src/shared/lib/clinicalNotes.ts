export const asClinicalRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const clinicalText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const clinicalArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];

export const getClinicalNoteTitle = (noteJson: unknown): string => {
  const note = asClinicalRecord(noteJson);
  return (
    clinicalText(note.title) ||
    clinicalText(note.template_name) ||
    clinicalText(note.chief_complaint) ||
    "Clinical Consultation Note"
  );
};

export const buildClinicalNoteMarkdown = (noteJson: unknown, context?: { patientName?: string; doctorName?: string; encounterType?: string }) => {
  const note = asClinicalRecord(noteJson);
  const sections = asClinicalRecord(note.sections);
  const soap = asClinicalRecord(note.soap_note);
  const report = asClinicalRecord(note.medical_report);
  const sop = asClinicalRecord(note.sop_draft);
  const title = getClinicalNoteTitle(noteJson);

  const sectionValue = (key: string) =>
    clinicalText(note[key]) ||
    clinicalText(sections[key]) ||
    clinicalText(soap[key]) ||
    clinicalText(report[key]);

  const listSection = (label: string, value: unknown) => {
    const items = clinicalArray(value);
    if (items.length === 0) return "";
    return `\n## ${label}\n${items.map((item) => `- ${item}`).join("\n")}\n`;
  };

  const sopSteps = clinicalArray(sop.steps);

  return `# ${title}

## Patient
${context?.patientName || clinicalText(report.patient) || "Patient"}

## Clinician
${context?.doctorName || clinicalText(report.doctor) || "Healthcare professional"}

## Encounter Type
${context?.encounterType || "Consultation"}

## Subjective
${sectionValue("subjective") || sectionValue("chief_complaint") || "Not documented."}

## Objective
${sectionValue("objective") || "Not documented."}

## Assessment
${sectionValue("assessment") || "Pending clinician review."}

## Plan
${sectionValue("plan") || "Pending clinician review."}

## Follow-Up
${sectionValue("follow_up") || sectionValue("followUp") || "Not documented."}
${listSection("Symptoms", note.symptoms || report.symptoms)}
${listSection("Safety-Net Advice", note.safety_net || report.safety_net)}
${sopSteps.length ? `\n## SOP / Care Workflow Draft\n${sopSteps.map((step) => `- ${step}`).join("\n")}\n` : ""}
## Professional Review Notice
This document was finalized by a healthcare professional in Neo Synapse.
`;
};

export const buildReportJsonFromClinicalNote = (params: {
  noteId: string;
  encounterId: string;
  finalJson: Record<string, unknown>;
  patientName?: string;
  doctorName?: string;
  encounterType?: string;
}) => {
  const title = getClinicalNoteTitle(params.finalJson);
  const markdown = buildClinicalNoteMarkdown(params.finalJson, {
    patientName: params.patientName,
    doctorName: params.doctorName,
    encounterType: params.encounterType,
  });

  return {
    title,
    status: "finalized",
    source: "clinical_note_finalized",
    note_id: params.noteId,
    encounter_id: params.encounterId,
    generated_at: new Date().toISOString(),
    summary: clinicalText(params.finalJson.summary) || clinicalText(asClinicalRecord(params.finalJson.medical_report).summary) || title,
    markdown,
    clinical_note: params.finalJson,
  };
};
