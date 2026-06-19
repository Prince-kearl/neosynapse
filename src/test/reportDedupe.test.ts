import { describe, expect, it } from "vitest";
import {
  createReportDedupeKey,
  hasSavedReportKey,
  markReportKeySaved,
  readSavedReportKeys,
  stableStringify,
} from "@/shared/lib/reportDedupe";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("report dedupe helpers", () => {
  it("creates stable keys when object property order changes", () => {
    const first = createReportDedupeKey([{ summary: "A", urgency: "urgent" }, ["cough", "fever"]]);
    const second = createReportDedupeKey([{ urgency: "urgent", summary: "A" }, ["cough", "fever"]]);

    expect(first).toBe(second);
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("remembers saved report keys per user across refreshes", () => {
    const storage = createMemoryStorage();
    const reportKey = createReportDedupeKey(["symptom_triage", "patient-1", "wheezing"]);

    expect(hasSavedReportKey("patient-1", reportKey, storage)).toBe(false);

    markReportKeySaved("patient-1", reportKey, storage);

    expect(hasSavedReportKey("patient-1", reportKey, storage)).toBe(true);
    expect(hasSavedReportKey("patient-2", reportKey, storage)).toBe(false);
    expect(readSavedReportKeys("patient-1", storage).has(reportKey)).toBe(true);
  });
});
