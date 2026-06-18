import { describe, expect, it } from "vitest";
import { getDefaultRouteForRole, isRouteAllowedForPrimaryRole } from "@/auth/roleRouting";

describe("role routing", () => {
  it("sends admins to the admin portal before other portal defaults", () => {
    expect(getDefaultRouteForRole("admin")).toBe("/admin/dashboard");
    expect(getDefaultRouteForRole("professional")).toBe("/professional/dashboard");
    expect(getDefaultRouteForRole("patient")).toBe("/patient/dashboard");
  });

  it("does not reuse a previous professional route for an admin login", () => {
    expect(isRouteAllowedForPrimaryRole("admin", "/professional/dashboard")).toBe(false);
    expect(isRouteAllowedForPrimaryRole("admin", "/admin/users")).toBe(true);
  });
});
