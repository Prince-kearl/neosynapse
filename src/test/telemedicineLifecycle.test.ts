import { describe, expect, it } from "vitest";
import {
  getPendingTelemedicineResolution,
  isStoredPatientWaitingCallFresh,
  isWaitingRoomStale,
  WAITING_ROOM_STALE_MS,
} from "@/shared/lib/telemedicineLifecycle";

describe("telemedicine lifecycle", () => {
  const now = new Date("2026-06-19T12:00:00.000Z").getTime();

  it("keeps a new pending encounter during the room creation grace period", () => {
    expect(
      getPendingTelemedicineResolution(
        { id: "enc-1", status: "pending", created_at: "2026-06-19T11:59:45.000Z" },
        [],
        now,
      ),
    ).toBeNull();
  });

  it("cancels pending encounters with ended or missing rooms after the grace period", () => {
    expect(
      getPendingTelemedicineResolution(
        { id: "enc-1", status: "pending", created_at: "2026-06-19T11:55:00.000Z" },
        [{ encounter_id: "enc-1", status: "ended", updated_at: "2026-06-19T11:56:00.000Z" }],
        now,
      ),
    ).toBe("cancelled");

    expect(
      getPendingTelemedicineResolution(
        { id: "enc-2", status: "pending", created_at: "2026-06-19T11:55:00.000Z" },
        [],
        now,
      ),
    ).toBe("cancelled");
  });

  it("cancels stale waiting rooms but keeps fresh waiting rooms", () => {
    expect(
      isWaitingRoomStale(
        { encounter_id: "enc-1", status: "waiting", updated_at: new Date(now - WAITING_ROOM_STALE_MS - 1).toISOString() },
        now,
      ),
    ).toBe(true);

    expect(
      getPendingTelemedicineResolution(
        { id: "enc-1", status: "pending", created_at: "2026-06-19T11:55:00.000Z" },
        [{ encounter_id: "enc-1", status: "waiting", updated_at: "2026-06-19T11:58:00.000Z" }],
        now,
      ),
    ).toBeNull();
  });

  it("only restores recent patient waiting calls", () => {
    expect(
      isStoredPatientWaitingCallFresh(
        { encounterId: "enc-1", roomId: "room-1", doctorId: "doc-1", startedAt: "2026-06-19T11:58:00.000Z" },
        now,
      ),
    ).toBe(true);

    expect(
      isStoredPatientWaitingCallFresh(
        { encounterId: "enc-1", roomId: "room-1", doctorId: "doc-1", startedAt: "2026-06-19T11:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });
});
