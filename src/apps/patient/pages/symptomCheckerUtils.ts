export type PossibleCondition = {
  name: string;
  likelihood: "high" | "medium" | "low";
  reason: string;
  definition?: string;
  causes?: string;
  symptoms?: string;
  treatments?: string;
  sources?: string[];
};

const genericReasonPatterns = [
  /this is a leading possibility/i,
  /this is a plausible possibility/i,
  /based on the symptoms provided/i,
  /more information is needed/i,
  /this condition matches some of your symptoms/i,
  /based on the information available/i,
];

export function isGenericConditionReason(reason: string): boolean {
  return genericReasonPatterns.some((pattern) => pattern.test(reason));
}

export function validatePossibleConditionReason(reason: string, reportedSymptoms: string[]): boolean {
  if (typeof reason !== "string") {
    return false;
  }

  const normalizedReason = reason.trim();
  if (normalizedReason.length < 50) {
    return false;
  }

  if (isGenericConditionReason(reason)) {
    return false;
  }

  const lowerReason = reason.toLowerCase();
  return reportedSymptoms.some((symptom) => lowerReason.includes(symptom.toLowerCase()));
}
