import type { EncounterStatus } from "@/shared/types/healthcare";

export type SessionState = EncounterStatus | "unknown";

export type SessionStateMeta = {
  label: string;
  shortLabel: string;
  description: string;
  badgeClassName: string;
  avatarClassName: string;
  sortIndex: number;
  isActionable: boolean;
  isTerminal: boolean;
};

export const SESSION_STATE_META: Record<SessionState, SessionStateMeta> = {
  pending: {
    label: "Waiting",
    shortLabel: "Waiting",
    description: "Patient is waiting for the professional to join.",
    badgeClassName: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    avatarClassName: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    sortIndex: 0,
    isActionable: true,
    isTerminal: false,
  },
  in_progress: {
    label: "In progress",
    shortLabel: "Live",
    description: "Consultation is currently active.",
    badgeClassName: "border-primary/50 bg-primary/10 text-primary",
    avatarClassName: "bg-primary/10 text-primary",
    sortIndex: 1,
    isActionable: true,
    isTerminal: false,
  },
  completed: {
    label: "Completed",
    shortLabel: "Done",
    description: "Consultation has ended successfully.",
    badgeClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    avatarClassName: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    sortIndex: 2,
    isActionable: false,
    isTerminal: true,
  },
  cancelled: {
    label: "Cancelled",
    shortLabel: "Cancelled",
    description: "Consultation was cancelled before completion.",
    badgeClassName: "border-destructive/40 bg-destructive/10 text-destructive",
    avatarClassName: "bg-destructive/10 text-destructive",
    sortIndex: 3,
    isActionable: false,
    isTerminal: true,
  },
  unknown: {
    label: "Unknown",
    shortLabel: "Unknown",
    description: "Session state is not recognized.",
    badgeClassName: "border-muted-foreground/30 bg-muted text-muted-foreground",
    avatarClassName: "bg-muted text-muted-foreground",
    sortIndex: 4,
    isActionable: false,
    isTerminal: false,
  },
};

export function normalizeSessionState(status: unknown): SessionState {
  if (status === "pending" || status === "in_progress" || status === "completed" || status === "cancelled") {
    return status;
  }
  return "unknown";
}

export function getSessionStateMeta(status: unknown): SessionStateMeta {
  return SESSION_STATE_META[normalizeSessionState(status)];
}

export function isActiveSessionState(status: unknown): boolean {
  return getSessionStateMeta(status).isActionable;
}

export function compareSessionState(a: unknown, b: unknown): number {
  return getSessionStateMeta(a).sortIndex - getSessionStateMeta(b).sortIndex;
}
