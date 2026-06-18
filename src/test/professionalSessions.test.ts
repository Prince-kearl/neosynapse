import { describe, expect, it } from "vitest";
import {
  getStaleInProgressResolution,
  hasLiveConsultationRoom,
  resolveEncounterStatusForDisplay,
} from "@/shared/lib/professionalSessions";

describe("professional session reconciliation", () => {
  it("keeps in-progress encounters live when a waiting or active room exists", () => {
    expect(hasLiveConsultationRoom([{ encounter_id: "enc-1", status: "waiting" }])).toBe(true);
    expect(hasLiveConsultationRoom([{ encounter_id: "enc-1", status: "active" }])).toBe(true);
    expect(
      getStaleInProgressResolution(
        { id: "enc-1", status: "in_progress", started_at: "2026-06-18T01:00:00.000Z" },
        [{ encounter_id: "enc-1", status: "active" }],
      ),
    ).toBeNull();
  });

  it("completes stale in-progress encounters that had started or ended rooms", () => {
    expect(
      getStaleInProgressResolution(
        { id: "enc-1", status: "in_progress", started_at: "2026-06-18T01:00:00.000Z" },
        [],
      ),
    ).toBe("completed");

    expect(
      getStaleInProgressResolution(
        { id: "enc-1", status: "in_progress", started_at: null },
        [{ encounter_id: "enc-1", status: "ended" }],
      ),
    ).toBe("completed");
  });

  it("cancels stale in-progress encounters that never established a room", () => {
    expect(
      resolveEncounterStatusForDisplay(
        { id: "enc-1", status: "in_progress", started_at: null },
        [],
      ),
    ).toBe("cancelled");
  });
});
