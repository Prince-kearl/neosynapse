export type LabResultStatus = "low" | "normal" | "high" | "critical" | "unknown";

export interface LabResultRecord {
  label: string;
  rawValue: string;
  units?: string;
  referenceRange?: string;
  status: LabResultStatus;
  explanation: string;
}

interface NumericRange {
  low?: number;
  high?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/([<>≤≥]{1,2})?\s*([+-]?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const numeric = Number(match[2].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseRangeFromString(value: string): NumericRange | null {
  const normalized = value.replace(/–/g, "-").replace(/\s+to\s+/gi, " - ").trim();
  const betweenMatch = normalized.match(/([+-]?\d+(?:\.\d+)?)\s*-\s*([+-]?\d+(?:\.\d+)?)/);
  if (betweenMatch) {
    const low = Number(betweenMatch[1]);
    const high = Number(betweenMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return { low, high };
    }
  }

  const greaterMatch = normalized.match(/(?:>=|≥)\s*([+-]?\d+(?:\.\d+)?)/);
  if (greaterMatch) {
    const low = Number(greaterMatch[1]);
    if (Number.isFinite(low)) return { low };
  }

  const lessMatch = normalized.match(/(?:<=|≤)\s*([+-]?\d+(?:\.\d+)?)/);
  if (lessMatch) {
    const high = Number(lessMatch[1]);
    if (Number.isFinite(high)) return { high };
  }

  const singleValueMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)(?:\s*[^\d\s].*)?$/);
  if (singleValueMatch) {
    const valueNumber = Number(singleValueMatch[1]);
    if (Number.isFinite(valueNumber)) {
      return { low: valueNumber, high: valueNumber };
    }
  }

  return null;
}

function parseRange(value: unknown): NumericRange | null {
  if (typeof value === "string") {
    return parseRangeFromString(value);
  }

  if (Array.isArray(value) && value.length >= 2) {
    const [first, second] = value;
    const low = parseNumber(first);
    const high = parseNumber(second);
    if (low !== null || high !== null) {
      return { low: low ?? undefined, high: high ?? undefined };
    }
  }

  if (isRecord(value)) {
    const low = parseNumber(value.low ?? value.min ?? value.minimum ?? value.lower);
    const high = parseNumber(value.high ?? value.max ?? value.maximum ?? value.upper);
    if (low !== null || high !== null) {
      return { low: low ?? undefined, high: high ?? undefined };
    }
  }

  return null;
}

function parseUnits(value: string): string | undefined {
  const match = value.match(/^[<>≤≥]?\s*[+-]?\d+(?:\.\d+)?\s*(.*)$/);
  if (!match) return undefined;
  const units = match[1].trim();
  return units || undefined;
}

function toSentence(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function inferStatusFromText(text?: string): LabResultStatus {
  if (!text) return "unknown";

  const normalized = text.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("emergency") || normalized.includes("urgent")) {
    return "critical";
  }

  if (normalized.includes("high") || normalized.includes("elevated") || normalized.includes("above")) {
    return "high";
  }

  if (normalized.includes("low") || normalized.includes("decreased") || normalized.includes("below") || normalized.includes("reduced")) {
    return "low";
  }

  if (normalized.includes("normal") || normalized.includes("within range") || normalized.includes("in range")) {
    return "normal";
  }

  return "unknown";
}

export function determineLabResultStatus(
  value: number | null,
  range: NumericRange | null,
  rawStatus?: string,
  rawValueText?: string,
): LabResultStatus {
  const explicitStatus = inferStatusFromText(rawStatus) || inferStatusFromText(rawValueText);
  if (explicitStatus !== "unknown") {
    return explicitStatus;
  }

  if (value === null || !range) {
    return "unknown";
  }

  const { low, high } = range;
  if (low !== undefined && high !== undefined) {
    if (value < low) {
      const relativeDrop = low > 0 ? (low - value) / low : 0;
      return relativeDrop >= 0.5 ? "critical" : "low";
    }
    if (value > high) {
      const relativeRise = high > 0 ? (value - high) / high : 0;
      return relativeRise >= 0.5 ? "critical" : "high";
    }
    return "normal";
  }

  if (high !== undefined) {
    if (value > high) {
      const relativeRise = high > 0 ? (value - high) / high : 0;
      return relativeRise >= 0.5 ? "critical" : "high";
    }
    return "normal";
  }

  if (low !== undefined) {
    if (value < low) {
      const relativeDrop = low > 0 ? (low - value) / low : 0;
      return relativeDrop >= 0.5 ? "critical" : "low";
    }
    return "normal";
  }

  return "unknown";
}

function normalizeValue(value: unknown): { valueText: string; numericValue: number | null; units?: string } {
  if (typeof value === "number") {
    return { valueText: String(value), numericValue: value, units: undefined };
  }

  if (typeof value !== "string") {
    return { valueText: "", numericValue: null, units: undefined };
  }

  const trimmed = value.trim();
  const numericValue = parseNumber(trimmed);
  const units = parseUnits(trimmed);
  return { valueText: trimmed, numericValue, units };
}

function buildExplanation(status: LabResultStatus, referenceRange?: string): string {
  const rangeLabel = referenceRange ? ` the normal reference range of ${referenceRange}` : " the normal reference range";

  switch (status) {
    case "normal":
      return referenceRange
        ? `This result is within the normal reference range of ${referenceRange}.`
        : "This result is within the expected range for this test.";
    case "low":
      return referenceRange
        ? `This result is below the normal reference range of ${referenceRange}. Discuss this with your clinician.`
        : "This result is below the expected level for this test and should be reviewed by a clinician.";
    case "high":
      return referenceRange
        ? `This result is above the normal reference range of ${referenceRange}. Discuss this with your clinician.`
        : "This result is above the expected level for this test and should be reviewed by a clinician.";
    case "critical":
      return referenceRange
        ? `This result is far outside the normal reference range of ${referenceRange} and may require urgent review.`
        : "This result is far outside the expected range for this test and may require urgent review.";
    default:
      return referenceRange
        ? `A normal reference range of ${referenceRange} was provided, but this result could not be classified automatically.`
        : "This result could not be classified automatically. Share it with your clinician for interpretation.";
  }
}

function normalizeLabResultItem(item: unknown): LabResultRecord | null {
  if (!isRecord(item)) {
    return null;
  }

  const label = toSentence(
    String(item.test_name ?? item.test ?? item.name ?? item.label ?? item.title ?? "Lab result"),
  );
  if (!label) {
    return null;
  }

  const rawValue = item.result ?? item.value ?? item.result_value ?? item.measurement ?? item.reading ?? "";
  const { valueText, numericValue, units } = normalizeValue(rawValue);
  if (!valueText) {
    return null;
  }

  const referenceRangeText = toSentence(
    String(item.reference_range ?? item.normal_range ?? item.range ?? item.expected_range ?? ""),
  );
  const range = parseRange(item.reference_range ?? item.normal_range ?? item.range ?? item.expected_range);
  const status = determineLabResultStatus(numericValue, range, String(item.status ?? item.flag ?? item.category ?? ""), valueText);
  const explanation = buildExplanation(status, referenceRangeText || undefined);

  return {
    label,
    rawValue: valueText,
    units: item.units ? String(item.units).trim() : units,
    referenceRange: referenceRangeText || undefined,
    status,
    explanation,
  };
}

function extractLabItems(reportData: unknown): unknown[] {
  if (!isRecord(reportData)) return [];

  const candidateKeys = ["lab_results", "laboratory_results", "labs", "results", "tests", "laboratoryTests"];
  for (const key of candidateKeys) {
    const value = reportData[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      return value;
    }

    if (isRecord(value)) {
      return Object.values(value);
    }
  }

  return [];
}

export function normalizeLabResults(reportData: unknown): LabResultRecord[] {
  const items = extractLabItems(reportData);
  return items
    .map(normalizeLabResultItem)
    .filter((item): item is LabResultRecord => item !== null);
}
