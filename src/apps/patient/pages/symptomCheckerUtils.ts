export type PossibleCondition = {
  name: string;
  likelihood: "high" | "medium" | "low";
  reason: string;
  definition?: string;
  causes?: string;
  symptoms?: string;
  treatments?: string;
  first_aid?: string;
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

export function normalizeClinicalText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasDuplicateConditionReasons(conditions: Array<Pick<PossibleCondition, "reason">>): boolean {
  const seen = new Set<string>();
  return conditions.some((condition) => {
    const normalized = normalizeClinicalText(condition.reason || "");
    if (!normalized) return false;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
    return false;
  });
}

export function reasonMirrorsDefinition(reason: string | undefined, definition: string | undefined): boolean {
  if (!reason || !definition) return false;
  const normalizedReason = normalizeClinicalText(reason);
  const normalizedDefinition = normalizeClinicalText(definition);
  if (!normalizedReason || !normalizedDefinition) return false;
  return normalizedReason === normalizedDefinition;
}

const likelihoodRank: Record<PossibleCondition["likelihood"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortPossibleConditionsByLikelihood<T extends Pick<PossibleCondition, "likelihood">>(conditions: T[]): T[] {
  return [...conditions].sort((a, b) => likelihoodRank[a.likelihood] - likelihoodRank[b.likelihood]);
}

export function truncateClinicalText(value: string | undefined, maxLength = 150): string {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
  return `${clipped || text.slice(0, maxLength).trim()}...`;
}
