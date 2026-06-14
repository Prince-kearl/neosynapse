import { describe, expect, it } from "vitest";
import { normalizeLabResults, determineLabResultStatus } from "@/shared/lib/labResults";

describe("lab result normalization", () => {
  it("parses lab results with numeric values and reference range", () => {
    const reportData = {
      lab_results: [
        {
          test_name: "Hemoglobin",
          result: "11.2 g/dL",
          reference_range: "12.0 - 16.0 g/dL",
        },
        {
          test_name: "White blood cell count",
          result: "15.0 x10^9/L",
          reference_range: "4.5 - 11.0 x10^9/L",
        },
      ],
    };

    const results = normalizeLabResults(reportData);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      label: "Hemoglobin",
      rawValue: "11.2 g/dL",
      status: "low",
    });
    expect(results[1]).toMatchObject({
      label: "White blood cell count",
      rawValue: "15.0 x10^9/L",
      status: "high",
    });
  });

  it("detects critical values when results are far outside the normal range", () => {
    expect(determineLabResultStatus(30, { low: 4, high: 10 }, undefined, undefined)).toBe("critical");
    expect(determineLabResultStatus(1, { low: 4, high: 10 }, undefined, undefined)).toBe("critical");
  });

  it("returns unknown when no numeric value or range is available", () => {
    const reportData = {
      lab_results: [
        {
          test_name: "HIV antibody",
          result: "negative",
          reference_range: "Negative",
        },
      ],
    };

    const results = normalizeLabResults(reportData);
    expect(results[0].status).toBe("unknown");
    expect(results[0].explanation).toContain("could not be classified");
  });
});
