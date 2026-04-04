import { act, renderHook } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useWebRTC } from "./useWebRTC";

type RoomUpdate = { values: Record<string, unknown>; id: string };

const mockState = vi.hoisted(() => ({
  order: [] as string[],
  roomUpdates: [] as RoomUpdate[],
}));

const supabaseMock = vi.hoisted(() => {
  const channelObject = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => {
      mockState.order.push("subscribed");
      return channelObject;
    }),
    unsubscribe: vi.fn(),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "consultation_rooms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { offer: { type: "offer", sdp: "offer-sdp" }, status: "waiting" },
                error: null,
              })),
            })),
          })),
          update: vi.fn((values: Record<string, unknown>) => ({
            eq: vi.fn(async (_column: string, id: string) => {
              mockState.roomUpdates.push({ values, id });
              return { data: null, error: null };
            }),
          })),
        };
      }

      if (table === "ice_candidates") {
        return {
          insert: vi.fn(async () => ({ data: null, error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(async () => {
                mockState.order.push("ice_batch_fetch");
                return { data: [], error: null };
              }),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table in mock: ${table}`);
    }),
    channel: vi.fn(() => channelObject),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock,
}));

class MockRTCPeerConnection {
  public signalingState: RTCSignalingState = "stable";
  public connectionState: RTCPeerConnectionState = "new";
  public remoteDescription: RTCSessionDescription | null = null;
  public ontrack: ((event: RTCTrackEvent) => void) | null = null;
  public onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  public onconnectionstatechange: (() => void) | null = null;

  addTrack() {}

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: "offer-sdp" };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (desc.type === "offer") this.signalingState = "have-local-offer";
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: "answer", sdp: "answer-sdp" };
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = desc as RTCSessionDescription;
  }

  async addIceCandidate(): Promise<void> {}

  close() {}
}

beforeAll(() => {
  Object.defineProperty(globalThis, "MediaStream", {
    value: class {
      addTrack() {}
      getTracks() { return []; }
      getVideoTracks() { return []; }
      getAudioTracks() { return []; }
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "RTCPeerConnection", {
    value: MockRTCPeerConnection,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "RTCSessionDescription", {
    value: class {
      constructor(public init: RTCSessionDescriptionInit) {
        Object.assign(this, init);
      }
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "RTCIceCandidate", {
    value: class {
      constructor(public init: RTCIceCandidateInit) {
        Object.assign(this, init);
      }
    },
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  mockState.order.length = 0;
  mockState.roomUpdates.length = 0;

  const mediaDevices = {
    getUserMedia: vi.fn(async () => ({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    })),
  };

  Object.defineProperty(navigator, "mediaDevices", {
    value: mediaDevices,
    writable: true,
    configurable: true,
  });
});

describe("useWebRTC telemedicine signaling", () => {
  it("subscribes to realtime before fetching ICE batch in joinCall", async () => {
    const { result } = renderHook(() =>
      useWebRTC({ roomId: null, userId: "doctor-user-id" })
    );

    await act(async () => {
      await result.current.joinCall(true, true, "room-join-1");
    });

    const subscribeIndex = mockState.order.indexOf("subscribed");
    const fetchIndex = mockState.order.indexOf("ice_batch_fetch");

    expect(subscribeIndex).toBeGreaterThanOrEqual(0);
    expect(fetchIndex).toBeGreaterThanOrEqual(0);
    expect(subscribeIndex).toBeLessThan(fetchIndex);
  });

  it("marks the explicit room ended on unmount cleanup", async () => {
    const { result, unmount } = renderHook(() =>
      useWebRTC({ roomId: null, userId: "patient-user-id" })
    );

    await act(async () => {
      await result.current.startCall(true, true, "room-start-1");
    });

    unmount();
    await Promise.resolve();

    expect(
      mockState.roomUpdates.some(
        (u) => u.id === "room-start-1" && u.values.status === "ended"
      )
    ).toBe(true);
  });
});
