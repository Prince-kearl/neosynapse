import { describe, expect, it } from "vitest";
import {
  hasDuplicateConditionReasons,
  isGenericConditionReason,
  reasonMirrorsDefinition,
  sortPossibleConditionsByLikelihood,
  truncateClinicalText,
  validatePossibleConditionReason,
} from "@/apps/patient/pages/symptomCheckerUtils";

describe("Symptom Checker possible condition reasoning", () => {
  it("validates generated possible_conditions.reason structure from a sample symptom payload", () => {
    const reportedSymptoms = [
      "fever",
      "sore throat",
      "runny nose",
      "fatigue",
      "body aches",
    ];

    const samplePayload = {
      possible_conditions: [
        {
          name: "Viral Infection (Flu/Common Cold)",
          likelihood: "high" as const,
          reason:
            "The reported fever, sore throat, runny nose, fatigue, and body aches are commonly associated with viral respiratory infections such as influenza or the common cold. These symptoms tend to occur together during viral illnesses and currently provide a stronger match than conditions that would typically present with more localized or severe findings. Because multiple classic viral symptoms are present, this is considered one of the most likely explanations.",
        },
      ],
    };

    samplePayload.possible_conditions.forEach((condition) => {
      expect(condition.name).toBe("Viral Infection (Flu/Common Cold)");
      expect(condition.likelihood).toBe("high");
      expect(condition.reason).toContain("fever");
      expect(condition.reason).toContain("sore throat");
      expect(validatePossibleConditionReason(condition.reason, reportedSymptoms)).toBe(true);
    });
  });

  it("validates symptom-specific references for multiple generated conditions", () => {
    const reportedSymptoms = [
      "fever",
      "cough",
      "chest tightness",
      "sore throat",
      "fatigue",
    ];

    const samplePayload = {
      possible_conditions: [
        {
          name: "Viral Infection (Flu/Common Cold)",
          likelihood: "high" as const,
          reason:
            "The reported fever, cough, sore throat, and fatigue are typical for viral respiratory infections such as influenza or the common cold. This cluster of symptoms makes this one of the stronger possibilities.",
        },
        {
          name: "Bronchitis",
          likelihood: "medium" as const,
          reason:
            "Persistent cough with chest tightness and mild fatigue can be seen in bronchitis. Because the symptoms are not overwhelmingly severe and there is no strong shortness of breath, this explanation is considered possible but less likely than a viral infection.",
        },
      ],
    };

    samplePayload.possible_conditions.forEach((condition) => {
      expect(condition.reason.length).toBeGreaterThan(50);
      expect(validatePossibleConditionReason(condition.reason, reportedSymptoms)).toBe(true);
    });
  });

  it("rejects generic placeholder reasoning", () => {
    expect(isGenericConditionReason("This is a leading possibility based on the symptoms provided.")).toBe(true);
    expect(isGenericConditionReason("This is a plausible possibility, but more information is needed.")).toBe(true);
  });

  it("detects duplicate condition explanations", () => {
    const duplicateReason = "Fever and sore throat can fit this condition because both symptoms commonly occur together in respiratory infections.";

    expect(
      hasDuplicateConditionReasons([
        { reason: duplicateReason },
        { reason: duplicateReason },
      ]),
    ).toBe(true);

    expect(
      hasDuplicateConditionReasons([
        { reason: "Fever and sore throat point toward a viral respiratory illness because they often occur together with fatigue." },
        { reason: "Chest tightness with cough keeps bronchitis in consideration because airway irritation can cause both symptoms." },
      ]),
    ).toBe(false);
  });

  it("rejects reason text that only mirrors the definition", () => {
    expect(
      reasonMirrorsDefinition(
        "Gastritis is inflammation of the stomach lining.",
        "Gastritis is inflammation of the stomach lining.",
      ),
    ).toBe(true);
    expect(
      reasonMirrorsDefinition(
        "Upper abdominal burning after meals can suggest gastritis because stomach-lining irritation often worsens with food or acid.",
        "Gastritis is inflammation of the stomach lining.",
      ),
    ).toBe(false);
  });

  it("sorts possible conditions by likelihood for a concise result list", () => {
    const sorted = sortPossibleConditionsByLikelihood([
      { name: "Less likely condition", likelihood: "low" as const },
      { name: "Likely condition", likelihood: "high" as const },
      { name: "Possible condition", likelihood: "medium" as const },
    ]);

    expect(sorted.map((condition) => condition.name)).toEqual([
      "Likely condition",
      "Possible condition",
      "Less likely condition",
    ]);
  });

  it("truncates long clinical copy for mobile-friendly result cards", () => {
    const text = "Patient reports fever, sore throat, cough, body aches, and fatigue for three days, which can fit a respiratory infection pattern.";
    const truncated = truncateClinicalText(text, 70);

    expect(truncated.length).toBeLessThanOrEqual(73);
    expect(truncated.endsWith("...")).toBe(true);
  });
});
