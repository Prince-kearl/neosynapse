export type EncounterLike = {
  id: string;
  status: string | null;
  started_at?: string | null;
};

export type ConsultationRoomLike = {
  encounter_id: string | null;
  status: string | null;
};

const liveRoomStatuses = new Set(["waiting", "active"]);

export function hasLiveConsultationRoom(rooms: ConsultationRoomLike[]): boolean {
  return rooms.some((room) => room.encounter_id && liveRoomStatuses.has(String(room.status || "").toLowerCase()));
}

export function getStaleInProgressResolution(
  encounter: EncounterLike,
  rooms: ConsultationRoomLike[],
): "completed" | "cancelled" | null {
  if (encounter.status !== "in_progress") return null;
  if (hasLiveConsultationRoom(rooms)) return null;

  const hadEndedRoom = rooms.some((room) => String(room.status || "").toLowerCase() === "ended");
  return encounter.started_at || hadEndedRoom ? "completed" : "cancelled";
}

export function resolveEncounterStatusForDisplay(
  encounter: EncounterLike,
  rooms: ConsultationRoomLike[],
): string {
  return getStaleInProgressResolution(encounter, rooms) || encounter.status || "unknown";
}
