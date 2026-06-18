import { describe, expect, it } from "vitest";
import { getPrimaryRoleFromRoles } from "@/auth/rolePriority";
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

  it("treats elevated users as their highest role", () => {
    expect(getPrimaryRoleFromRoles(["patient", "admin"], "patient")).toBe("admin");
    expect(getPrimaryRoleFromRoles(["patient", "professional"], "patient")).toBe("professional");
    expect(getPrimaryRoleFromRoles([], "patient")).toBe("patient");
  });
});
