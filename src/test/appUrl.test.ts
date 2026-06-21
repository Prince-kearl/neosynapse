import { describe, expect, it } from "vitest";
import { buildPublicAppUrl, DEFAULT_PUBLIC_APP_URL, normalizePublicAppUrl } from "@/shared/lib/appUrl";

describe("public application URL", () => {
  it("uses the Neo Synapse production domain by default", () => {
    expect(normalizePublicAppUrl()).toBe(DEFAULT_PUBLIC_APP_URL);
  });

  it("normalizes configured origins and builds absolute routes", () => {
    expect(normalizePublicAppUrl(" https://neosynapseai.com/// ")).toBe("https://neosynapseai.com");
    expect(buildPublicAppUrl("auth/reset-password")).toBe("https://neosynapseai.com/auth/reset-password");
  });
});
