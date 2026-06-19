const REPORT_DEDUPE_PREFIX = "neo-synapse:saved-report-keys";
const MAX_KEYS_PER_USER = 80;

function getReportKeyStorageKey(userId: string): string {
  return `${REPORT_DEDUPE_PREFIX}:${userId}`;
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function createReportDedupeKey(parts: unknown[]): string {
  const input = stableStringify(parts);
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function readSavedReportKeys(userId: string, storage?: Storage): Set<string> {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return new Set();

  try {
    const raw = targetStorage.getItem(getReportKeyStorageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function hasSavedReportKey(userId: string, reportKey: string, storage?: Storage): boolean {
  return readSavedReportKeys(userId, storage).has(reportKey);
}

export function markReportKeySaved(userId: string, reportKey: string, storage?: Storage): void {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;

  const keys = [...readSavedReportKeys(userId, targetStorage).values()].filter((key) => key !== reportKey);
  keys.push(reportKey);

  try {
    targetStorage.setItem(getReportKeyStorageKey(userId), JSON.stringify(keys.slice(-MAX_KEYS_PER_USER)));
  } catch {
    // Ignore storage failures. Server report creation should not depend on local persistence.
  }
}
