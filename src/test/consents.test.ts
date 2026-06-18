import { describe, expect, it } from "vitest";
import { isConsentGrantedByDefault } from "@/shared/lib/consents";

describe("consent defaults", () => {
  it("treats missing recording consent as granted so telemedicine documentation is opt-out", () => {
    expect(isConsentGrantedByDefault(undefined)).toBe(true);
    expect(isConsentGrantedByDefault(null)).toBe(true);
  });

  it("respects explicit patient consent choices", () => {
    expect(isConsentGrantedByDefault({ granted: true })).toBe(true);
    expect(isConsentGrantedByDefault({ granted: false })).toBe(false);
  });
});

