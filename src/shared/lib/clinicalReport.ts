import type { MedicalHistory, PatientProfile } from "@/shared/types/healthcare";

export type ClinicalReportUrgency = "non-urgent" | "needs-attention" | "urgent" | "emergency";

export interface ClinicalReportCondition {
  name: string;
  likelihood: string;
  confidence?: number;
  reason: string;
  definition?: string;
  causes?: string;
  symptoms?: string;
  treatments?: string;
  first_aid?: string;
  sources?: string[];
}

export interface ClinicalReportResult {
  urgency: ClinicalReportUrgency;
  summary: string;
  possible_conditions: ClinicalReportCondition[];
  recommended_action: string;
  urgency_reason?: string;
  risk_factors?: string[];
  medication_considerations?: string[];
  medical_history_impact?: string[];
  questions: string[];
  warning_signs: string[];
  fallback_mode?: boolean;
}

export interface BuildClinicalReportInput {
  result: ClinicalReportResult;
  patientId?: string | null;
  patientName?: string | null;
  patientEmail?: string | null;
  patientProfile?: PatientProfile | null;
  medicalHistory?: MedicalHistory | null;
  age?: string;
  gender?: string;
  selectedSymptoms: string[];
  duration?: string;
  generatedAt?: Date;
}

export interface BuiltClinicalReport {
  reportId: string;
  clinicalMarkdown: string;
  patientMarkdown: string;
  json: Record<string, unknown>;
}

const FACILITY = {
  name: "Achimota Hospital",
  system: "Ghana Health Information Management System (GHIMS)",
  address: "Achimota, Accra, Ghana",
  contact: "Tel: +233 (0) 302 000 000 | Email: records@achimotahospital.gov.gh",
  department: "Outpatient / Emergency Triage",
};

function formatDateTime(value: Date): string {
  return value.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reportIdFromDate(value: Date, patientId?: string | null): string {
  const stamp = value.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const patientPart = patientId ? patientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() : "PAT";
  return `GHIMS-AH-${stamp}-${patientPart}`;
}

function list(items?: string[] | null): string[] {
  return Array.isArray(items) ? items.map((item) => item.trim()).filter(Boolean) : [];
}

function printableList(items?: string[] | null, fallback = "Not recorded"): string {
  const values = list(items);
  return values.length ? values.join(", ") : fallback;
}

function bullets(items?: string[] | null, fallback = "Not recorded"): string {
  const values = list(items);
  return values.length ? values.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function tableCell(value?: string | number | null): string {
  return String(value ?? "Not recorded").replace(/\n/g, " ").trim() || "Not recorded";
}

function calculateAgeFromDob(dateOfBirth?: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? String(age) : null;
}

function buildClinicalNarrative(input: BuildClinicalReportInput): string {
  const { result, patientProfile, medicalHistory, selectedSymptoms, duration } = input;
  const age = input.age || calculateAgeFromDob(patientProfile?.date_of_birth) || "age not recorded";
  const gender = input.gender || patientProfile?.gender || "gender not recorded";
  const conditions = printableList(medicalHistory?.existing_conditions, "no documented chronic conditions");
  const symptoms = printableList(selectedSymptoms, "reported symptoms not recorded");
  const durationText = duration || "duration not recorded";
  const leadingCondition = result.possible_conditions[0]?.name || "the presenting complaint";
  const urgencyReason = result.urgency_reason || result.summary;

  return `The patient is a ${age}-year-old ${gender} with a documented history of ${conditions}. The patient presents with ${durationText} history of ${symptoms}. Clinical decision support findings raise concern for ${leadingCondition}. ${urgencyReason} This assessment requires clinician review and correlation with vital signs, examination findings, and laboratory investigations.`;
}

function triageCategory(urgency: ClinicalReportUrgency): string {
  if (urgency === "emergency") return "EMERGENCY";
  if (urgency === "urgent") return "URGENT";
  if (urgency === "needs-attention") return "PRIORITY REVIEW";
  return "ROUTINE";
}

function defaultInvestigations(result: ClinicalReportResult): string[] {
  const text = [
    result.summary,
    result.urgency_reason,
    ...result.possible_conditions.map((condition) => `${condition.name} ${condition.reason}`),
  ].join(" ").toLowerCase();

  const investigations = new Set<string>([
    "Vital signs assessment",
    "Focused clinical examination",
  ]);

  if (/(diabetes|hypergly|hhs|urination|thirst|blurred vision|glucose)/.test(text)) {
    investigations.add("Random Blood Glucose");
    investigations.add("HbA1c");
    investigations.add("Urinalysis");
    investigations.add("Serum Electrolytes");
    investigations.add("Renal Function Test");
  }
  if (/(infection|fever|urinary|uti)/.test(text)) {
    investigations.add("Full Blood Count");
    investigations.add("Urine microscopy, culture and sensitivity if indicated");
  }
  if (/(chest|cardiac|hypertension|breath|shortness)/.test(text)) {
    investigations.add("ECG if indicated");
  }

  return [...investigations];
}

function defaultManagementPlan(result: ClinicalReportResult): string[] {
  const plan = [
    result.recommended_action,
    "Record full vital signs and complete clinical examination.",
    "Review current medications, allergies, and relevant medical history.",
  ];

  if (result.medication_considerations?.length) {
    plan.push(...result.medication_considerations.slice(0, 3));
  }

  if (result.urgency === "urgent" || result.urgency === "emergency") {
    plan.push("Arrange prompt clinician review and escalate according to facility triage protocol.");
  } else {
    plan.push("Provide safety-net advice and arrange follow-up if symptoms persist or worsen.");
  }

  return plan;
}

function conditionRows(result: ClinicalReportResult): Array<{ condition: string; likelihood: string; evidence: string }> {
  return result.possible_conditions.slice(0, 6).map((condition) => ({
    condition: condition.name,
    likelihood: condition.confidence !== undefined
      ? `${condition.likelihood} (${Math.round(condition.confidence)}%)`
      : condition.likelihood,
    evidence: condition.reason,
  }));
}

export function buildClinicalAssessmentReport(input: BuildClinicalReportInput): BuiltClinicalReport {
  const generatedAt = input.generatedAt ?? new Date();
  const reportId = reportIdFromDate(generatedAt, input.patientId);
  const age = input.age || calculateAgeFromDob(input.patientProfile?.date_of_birth) || "Not recorded";
  const gender = input.gender || input.patientProfile?.gender || "Not recorded";
  const patientName = input.patientName || input.patientEmail || "Not recorded";
  const emergencyContact = [
    input.patientProfile?.emergency_contact_name,
    input.patientProfile?.emergency_contact_phone,
  ].filter(Boolean).join(" - ") || "Not recorded";
  const insurance = input.patientProfile?.insurance_info ?? {};
  const nhis = typeof insurance === "object" && insurance && "nhisNumber" in insurance
    ? String((insurance as Record<string, unknown>).nhisNumber)
    : "Not recorded";
  const clinicalAssessment = buildClinicalNarrative(input);
  const investigations = defaultInvestigations(input.result);
  const managementPlan = defaultManagementPlan(input.result);
  const differentials = conditionRows(input.result);
  const riskFactors = list(input.result.risk_factors).length
    ? list(input.result.risk_factors)
    : [
      ...list(input.medicalHistory?.existing_conditions),
      ...(input.medicalHistory?.family_medical_history ? [`Family history: ${input.medicalHistory.family_medical_history}`] : []),
    ].slice(0, 8);

  const clinicalReport = {
    document_type: "Clinical Assessment and Triage Report",
    facility: FACILITY,
    report_id: reportId,
    generated_at: generatedAt.toISOString(),
    attending_clinician: "To be assigned",
    department: FACILITY.department,
    patient: {
      patient_id: input.patientId || "Not recorded",
      full_name: patientName,
      age,
      gender,
      national_health_insurance_number: nhis,
      phone_number: input.patientProfile?.phone || "Not recorded",
      emergency_contact: emergencyContact,
      date_of_visit: generatedAt.toISOString().slice(0, 10),
    },
    medical_history: {
      existing_conditions: list(input.medicalHistory?.existing_conditions),
      allergies: list(input.medicalHistory?.allergies),
      current_medications: list(input.medicalHistory?.current_medications),
      past_surgical_history: list(input.medicalHistory?.past_surgeries),
      family_medical_history: input.medicalHistory?.family_medical_history || "Not recorded",
      additional_notes: input.medicalHistory?.notes || "Not recorded",
    },
    presenting_complaints: {
      symptoms: input.selectedSymptoms,
      duration: input.duration || "Not recorded",
    },
    vital_signs: {
      blood_pressure: "Not recorded",
      pulse_rate: "Not recorded",
      respiratory_rate: "Not recorded",
      temperature: "Not recorded",
      oxygen_saturation: "Not recorded",
      weight: "Not recorded",
      height: "Not recorded",
      bmi: "Not recorded",
    },
    clinical_assessment: clinicalAssessment,
    differential_diagnoses: differentials,
    risk_factors: riskFactors,
    investigations_recommended: investigations,
    triage_outcome: {
      category: triageCategory(input.result.urgency),
      clinical_justification: input.result.urgency_reason || input.result.summary,
    },
    management_plan: managementPlan,
    clinician_notes: "",
    footer: {
      prepared_through: "GHIMS Clinical Decision Support Module",
      hospital_stamp: "Hospital stamp area",
      doctor_signature: "Doctor signature",
      nurse_signature: "Nurse signature",
      patient_acknowledgment: "Patient acknowledgment",
    },
  };

  const patientMarkdown = `# Patient-Friendly Report

## What We Found
${input.result.summary}

## Possible Conditions
${input.result.possible_conditions.length ? input.result.possible_conditions.map((condition, index) => `${index + 1}. ${condition.name}${condition.confidence !== undefined ? ` - ${Math.round(condition.confidence)}% confidence` : ""}\n   - ${condition.reason}`).join("\n") : "No possible conditions listed."}

## What To Do Next
${input.result.recommended_action}

## First Aid / Self-Care
${input.result.possible_conditions.map((condition) => condition.first_aid).filter(Boolean).slice(0, 3).map((item) => `- ${item}`).join("\n") || "- Follow clinician advice and seek care if symptoms worsen."}

## Warning Signs
${bullets(input.result.warning_signs, "No warning signs listed")}

## How Your Medical History Was Used
${bullets(input.result.medical_history_impact, "No specific medical history impact was recorded")}
`;

  const differentialTable = differentials.length
    ? differentials.map((item) => `| ${tableCell(item.condition)} | ${tableCell(item.likelihood)} | ${tableCell(item.evidence)} |`).join("\n")
    : "| Not recorded | Not recorded | Not recorded |";

  const clinicalMarkdown = `# ${FACILITY.name}
${FACILITY.address}  
${FACILITY.contact}  
${FACILITY.system}

**Hospital Logo:** ____________________        **GHIMS Logo:** ____________________

## Clinical Assessment and Triage Report

| Report Details |  |
| --- | --- |
| Report ID | ${reportId} |
| Date and Time Generated | ${formatDateTime(generatedAt)} |
| Attending Clinician | To be assigned |
| Department | ${FACILITY.department} |

## Patient Information

| Field | Details |
| --- | --- |
| Patient ID | ${tableCell(input.patientId)} |
| Full Name | ${tableCell(patientName)} |
| Age | ${tableCell(age)} |
| Gender | ${tableCell(gender)} |
| National Health Insurance Number | ${tableCell(nhis)} |
| Phone Number | ${tableCell(input.patientProfile?.phone)} |
| Emergency Contact | ${tableCell(emergencyContact)} |
| Date of Visit | ${generatedAt.toISOString().slice(0, 10)} |

## Medical History

| Field | Details |
| --- | --- |
| Existing Conditions | ${tableCell(printableList(input.medicalHistory?.existing_conditions))} |
| Allergies | ${tableCell(printableList(input.medicalHistory?.allergies))} |
| Current Medications | ${tableCell(printableList(input.medicalHistory?.current_medications))} |
| Past Surgical History | ${tableCell(printableList(input.medicalHistory?.past_surgeries))} |
| Family Medical History | ${tableCell(input.medicalHistory?.family_medical_history)} |
| Additional Notes | ${tableCell(input.medicalHistory?.notes)} |

## Presenting Complaints

${bullets(input.selectedSymptoms, "No presenting complaints recorded")}

**Duration of Symptoms:** ${tableCell(input.duration)}

## Vital Signs

| Vital Sign | Value |
| --- | --- |
| Blood Pressure | Not recorded |
| Pulse Rate | Not recorded |
| Respiratory Rate | Not recorded |
| Temperature | Not recorded |
| Oxygen Saturation | Not recorded |
| Weight | Not recorded |
| Height | Not recorded |
| BMI | Not recorded |

## Clinical Assessment

${clinicalAssessment}

## Differential Diagnosis

| Condition | Clinical Likelihood | Supporting Evidence |
| --- | --- | --- |
${differentialTable}

## Risk Factors Identified

${bullets(riskFactors, "No specific risk factors recorded")}

## Investigations Recommended

${bullets(investigations)}

## Triage Outcome

**TRIAGE CATEGORY:** ${triageCategory(input.result.urgency)}

**Clinical Justification:** ${input.result.urgency_reason || input.result.summary}

## Management Plan

${bullets(managementPlan)}

## Clinician Notes

________________________________________________________________________________

________________________________________________________________________________

________________________________________________________________________________

________________________________________________________________________________

## Signatures and Acknowledgment

| Role | Name / Signature | Date |
| --- | --- | --- |
| Doctor | ______________________________ | __________ |
| Nurse | ______________________________ | __________ |
| Patient / Guardian | ______________________________ | __________ |

**Hospital Stamp:** ______________________________

Prepared through GHIMS Clinical Decision Support Module. Page 1 of 1.
`;

  return {
    reportId,
    clinicalMarkdown,
    patientMarkdown,
    json: {
      title: "Clinical Assessment and Triage Report",
      report_id: reportId,
      generatedAt: generatedAt.toISOString(),
      generatedBy: "GHIMS Clinical Decision Support Module",
      facility: FACILITY,
      patient_friendly_report: {
        title: "Patient-Friendly Report",
        markdown: patientMarkdown,
        summary: input.result.summary,
        next_steps: input.result.recommended_action,
        warning_signs: input.result.warning_signs,
      },
      clinical_report: clinicalReport,
      clinical_markdown: clinicalMarkdown,
      markdown: clinicalMarkdown,
      triage_result: input.result,
      fallback_mode: input.result.fallback_mode || false,
      disclaimer: "This report is clinical decision support only and must be reviewed by a qualified healthcare professional.",
    },
  };
}
