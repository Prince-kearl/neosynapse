export type DiagnosticStatus = "healthy" | "degraded" | "unavailable";

export type DiagnosticCheck = {
  id: string;
  name: string;
  description: string;
  category: "core" | "data" | "services" | "device";
  status: DiagnosticStatus;
  detail: string;
  latencyMs?: number;
};

export type SystemHealthSummary = {
  status: DiagnosticStatus;
  healthy: number;
  degraded: number;
  unavailable: number;
  score: number;
};

export type EdgeFunctionReachability = "reachable" | "auth-rejected" | "missing" | "server-error";

export function classifyEdgeFunctionHttpStatus(status: number): EdgeFunctionReachability {
  if (status >= 200 && status < 400) return "reachable";
  if (status === 401 || status === 403) return "auth-rejected";
  if (status === 404) return "missing";
  return "server-error";
}

export function summarizeSystemHealth(checks: DiagnosticCheck[]): SystemHealthSummary {
  const healthy = checks.filter((check) => check.status === "healthy").length;
  const degraded = checks.filter((check) => check.status === "degraded").length;
  const unavailable = checks.filter((check) => check.status === "unavailable").length;
  const total = checks.length;
  const score = total === 0 ? 0 : Math.round(((healthy + degraded * 0.5) / total) * 100);

  return {
    status: unavailable > 0 ? "unavailable" : degraded > 0 ? "degraded" : "healthy",
    healthy,
    degraded,
    unavailable,
    score,
  };
}

export function getDiagnosticErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  return "The diagnostic check could not be completed.";
}
