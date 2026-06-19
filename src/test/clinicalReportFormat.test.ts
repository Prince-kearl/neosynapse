import { describe, expect, it } from "vitest";
import { buildClinicalAssessmentReport } from "@/shared/lib/clinicalReport";

describe("clinical assessment report formatting", () => {
  it("builds a GHIMS-style clinical report and a patient-friendly report", () => {
    const report = buildClinicalAssessmentReport({
      generatedAt: new Date("2026-06-19T10:30:00Z"),
      patientId: "patient-123",
      patientName: "Kwame Mensah",
      patientEmail: "kwame@example.com",
      patientProfile: {
        id: "pp-1",
        user_id: "patient-123",
        date_of_birth: "1968-02-10",
        gender: "male",
        preferred_language: "English",
        phone: "0240000000",
        emergency_contact_name: "Ama Mensah",
        emergency_contact_phone: "0200000000",
        insurance_info: { nhisNumber: "NHIS-001" },
        created_at: "",
        updated_at: "",
      },
      medicalHistory: {
        id: "mh-1",
        user_id: "patient-123",
        existing_conditions: ["Type 2 Diabetes", "Hypertension", "Chronic Kidney Disease Stage 2"],
        allergies: ["Penicillin"],
        current_medications: ["Metformin", "Amlodipine", "Losartan"],
        past_surgeries: [],
        family_medical_history: "Family history of diabetes",
        notes: "BMI 32",
        onboarding_completed: true,
        privacy_acknowledged_at: null,
        completed_at: null,
        last_reviewed_at: null,
        created_at: "",
        updated_at: "",
      },
      age: "58",
      gender: "male",
      duration: "One week",
      selectedSymptoms: ["Frequent urination", "Extreme thirst", "Blurred vision", "Fatigue"],
      result: {
        urgency: "urgent",
        summary: "Symptoms and medical history suggest significant hyperglycemia.",
        urgency_reason: "Known diabetes with polyuria, polydipsia, blurred vision, fatigue, and CKD increases risk of diabetic complications.",
        risk_factors: ["Type 2 Diabetes", "Chronic Kidney Disease", "Obesity"],
        medication_considerations: ["Confirm whether Metformin doses were missed."],
        medical_history_impact: ["Type 2 Diabetes increased concern for hyperglycemia."],
        recommended_action: "Attend urgent medical review for glucose testing.",
        warning_signs: ["Confusion", "Vomiting", "Severe weakness"],
        questions: ["What is the current blood sugar reading?"],
        possible_conditions: [
          {
            name: "Uncontrolled Type 2 Diabetes Mellitus",
            likelihood: "high",
            confidence: 92,
            reason: "Polyuria, polydipsia, blurred vision, and fatigue in a patient with known diabetes.",
            first_aid: "Drink water if able and seek prompt glucose assessment.",
          },
          {
            name: "Hyperosmolar Hyperglycemic State",
            likelihood: "medium",
            confidence: 81,
            reason: "Diabetes and dehydration symptoms raise concern for severe hyperglycemia.",
          },
        ],
      },
    });

    expect(report.json.title).toBe("Clinical Assessment and Triage Report");
    expect(report.clinicalMarkdown).toContain("NeoSynapse");
    expect(report.clinicalMarkdown).toContain("Ghana Health Information Management System (GHIMS)");
    expect(report.clinicalMarkdown).toContain("## Vital Signs");
    expect(report.clinicalMarkdown).toContain("## Differential Diagnosis");
    expect(report.clinicalMarkdown).toContain("TRIAGE CATEGORY:** URGENT");
    expect(report.clinicalMarkdown).toContain("Doctor | ______________________________");
    expect(report.patientMarkdown).toContain("# Patient-Friendly Report");
    expect(report.patientMarkdown).toContain("Uncontrolled Type 2 Diabetes Mellitus");
    expect(report.clinicalMarkdown).not.toContain("AI MEDICAL ASSESSMENT REPORT");
    expect(report.clinicalMarkdown).not.toContain("chatbot");
  });
});
