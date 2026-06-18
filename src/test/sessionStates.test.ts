import { describe, expect, it } from "vitest";
import {
  compareSessionState,
  getSessionStateMeta,
  isActiveSessionState,
  normalizeSessionState,
} from "@/shared/lib/sessionStates";

describe("professional session states", () => {
  it("normalizes known and unknown encounter statuses", () => {
    expect(normalizeSessionState("pending")).toBe("pending");
    expect(normalizeSessionState("in_progress")).toBe("in_progress");
    expect(normalizeSessionState("completed")).toBe("completed");
    expect(normalizeSessionState("cancelled")).toBe("cancelled");
    expect(normalizeSessionState("paused")).toBe("unknown");
  });

  it("marks only pending and in-progress sessions as actionable", () => {
    expect(isActiveSessionState("pending")).toBe(true);
    expect(isActiveSessionState("in_progress")).toBe(true);
    expect(isActiveSessionState("completed")).toBe(false);
    expect(isActiveSessionState("cancelled")).toBe(false);
  });

  it("sorts sessions by clinical workflow state", () => {
    const states = ["cancelled", "in_progress", "completed", "pending", "unknown"];
    expect(states.sort(compareSessionState)).toEqual(["pending", "in_progress", "completed", "cancelled", "unknown"]);
    expect(getSessionStateMeta("pending").label).toBe("Waiting");
  });
});
