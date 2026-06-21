import { describe, expect, it } from "vitest";
import {
  classifyEdgeFunctionHttpStatus,
  getDiagnosticErrorMessage,
  summarizeSystemHealth,
  type DiagnosticCheck,
} from "@/shared/lib/systemDiagnostics";

const check = (status: DiagnosticCheck["status"]): DiagnosticCheck => ({
  id: status,
  name: status,
  description: "test",
  category: "core",
  status,
  detail: "test",
});

describe("system diagnostics", () => {
  it("summarizes healthy and degraded checks", () => {
    expect(summarizeSystemHealth([check("healthy"), check("healthy")])).toEqual({
      status: "healthy",
      healthy: 2,
      degraded: 0,
      unavailable: 0,
      score: 100,
    });

    expect(summarizeSystemHealth([check("healthy"), check("degraded")])).toMatchObject({
      status: "degraded",
      healthy: 1,
      degraded: 1,
      score: 75,
    });
  });

  it("treats unavailable dependencies as the overall failure state", () => {
    expect(summarizeSystemHealth([check("healthy"), check("unavailable")])).toMatchObject({
      status: "unavailable",
      unavailable: 1,
      score: 50,
    });
  });

  it("normalizes diagnostic errors", () => {
    expect(getDiagnosticErrorMessage(new Error("Access denied"))).toBe("Access denied");
    expect(getDiagnosticErrorMessage({ message: "Timed out" })).toBe("Timed out");
    expect(getDiagnosticErrorMessage(null)).toBe("The diagnostic check could not be completed.");
  });

  it("distinguishes deployed protected functions from missing functions", () => {
    expect(classifyEdgeFunctionHttpStatus(200)).toBe("reachable");
    expect(classifyEdgeFunctionHttpStatus(204)).toBe("reachable");
    expect(classifyEdgeFunctionHttpStatus(401)).toBe("auth-rejected");
    expect(classifyEdgeFunctionHttpStatus(403)).toBe("auth-rejected");
    expect(classifyEdgeFunctionHttpStatus(404)).toBe("missing");
    expect(classifyEdgeFunctionHttpStatus(500)).toBe("server-error");
  });
});
