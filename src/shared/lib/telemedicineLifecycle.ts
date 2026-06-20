export const PATIENT_WAITING_CALL_STORAGE_KEY = "neo-synapse.patient-waiting-call";

export const PENDING_ROOM_GRACE_MS = 30_000;
export const WAITING_ROOM_STALE_MS = 15 * 60_000;

export type TelemedicineEncounterLike = {
  id: string;
  status: string | null;
  created_at?: string | null;
  professional_id?: string | null;
};

export type TelemedicineRoomLike = {
  id?: string | null;
  encounter_id: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StoredPatientWaitingCall = {
  encounterId: string;
  roomId: string | null;
  doctorId: string;
  startedAt: string;
};

const liveRoomStatuses = new Set(["waiting", "active"]);

const timestampMs = (value?: string | null) => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

export function isLiveTelemedicineRoom(room: TelemedicineRoomLike): boolean {
  return liveRoomStatuses.has(String(room.status || "").toLowerCase());
}

export function hasLiveTelemedicineRoom(rooms: TelemedicineRoomLike[]): boolean {
  return rooms.some(isLiveTelemedicineRoom);
}

export function isWaitingRoomStale(room: TelemedicineRoomLike, nowMs = Date.now()): boolean {
  if (String(room.status || "").toLowerCase() !== "waiting") return false;
  const lastTouched = timestampMs(room.updated_at) || timestampMs(room.created_at);
  if (!lastTouched) return false;
  return nowMs - lastTouched > WAITING_ROOM_STALE_MS;
}

export function getPendingTelemedicineResolution(
  encounter: TelemedicineEncounterLike,
  rooms: TelemedicineRoomLike[],
  nowMs = Date.now(),
): "cancelled" | null {
  if (encounter.status !== "pending") return null;

  const createdAt = timestampMs(encounter.created_at);
  const withinRoomCreationGrace = createdAt > 0 && nowMs - createdAt < PENDING_ROOM_GRACE_MS;
  if (withinRoomCreationGrace && rooms.length === 0) return null;

  if (!hasLiveTelemedicineRoom(rooms)) return "cancelled";
  if (rooms.some((room) => isLiveTelemedicineRoom(room) && isWaitingRoomStale(room, nowMs))) return "cancelled";

  return null;
}

export function isOpenTelemedicineEncounter(encounter: TelemedicineEncounterLike): boolean {
  return ["pending", "in_progress"].includes(String(encounter.status || "").toLowerCase());
}

export function selectReusablePatientTelemedicineEncounter<T extends TelemedicineEncounterLike>(
  encounters: T[],
): T | null {
  const openEncounters = encounters
    .filter(isOpenTelemedicineEncounter)
    .sort((a, b) => timestampMs(b.created_at) - timestampMs(a.created_at));

  return openEncounters[0] || null;
}

export function getDuplicatePatientTelemedicineEncounterIds<T extends TelemedicineEncounterLike>(
  encounters: T[],
  reusableEncounterId: string | null,
): string[] {
  return encounters
    .filter((encounter) => isOpenTelemedicineEncounter(encounter) && encounter.id !== reusableEncounterId)
    .map((encounter) => encounter.id);
}

export function isStoredPatientWaitingCallFresh(
  call: StoredPatientWaitingCall | null,
  nowMs = Date.now(),
): call is StoredPatientWaitingCall {
  if (!call?.encounterId || !call.doctorId || !call.startedAt) return false;
  const startedAt = timestampMs(call.startedAt);
  return startedAt > 0 && nowMs - startedAt <= WAITING_ROOM_STALE_MS;
}

export function readStoredPatientWaitingCall(storage: Pick<Storage, "getItem"> = window.localStorage) {
  try {
    const raw = storage.getItem(PATIENT_WAITING_CALL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPatientWaitingCall;
    return isStoredPatientWaitingCallFresh(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredPatientWaitingCall(
  call: StoredPatientWaitingCall,
  storage: Pick<Storage, "setItem"> = window.localStorage,
) {
  storage.setItem(PATIENT_WAITING_CALL_STORAGE_KEY, JSON.stringify(call));
}

export function clearStoredPatientWaitingCall(
  storage: Pick<Storage, "removeItem"> = window.localStorage,
) {
  storage.removeItem(PATIENT_WAITING_CALL_STORAGE_KEY);
}
