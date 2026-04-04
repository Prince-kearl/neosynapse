import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { streamMedicalChat } from "@/lib/medical-chat";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
};

export type ChatSession = {
  id: string;
  name: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
};

export type ChatSyncStatus = "idle" | "syncing" | "synced" | "retry";

type UseMedicalChatOptions = {
  storageKey?: string;
  userId?: string;
};

type PersistedChatStore = {
  version: 2;
  activeSessionId: string | null;
  sessions: Array<{
    id: string;
    name: string;
    isPinned?: boolean;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string;
      imageUrl?: string;
    }>;
  }>;
};

const DEFAULT_STORAGE_KEY = "neo-synapse-ai-chat";

function createSession(name = "New Conversation"): ChatSession {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function toDate(value: unknown): Date {
  if (typeof value === "string" || value instanceof Date) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function normalizeSession(raw: any): ChatSession | null {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;

  const messages: ChatMessage[] = Array.isArray(raw.messages)
    ? raw.messages
        .filter((msg) => msg && typeof msg === "object" && typeof msg.id === "string")
        .map((msg) => ({
          id: String(msg.id),
          role: msg.role === "assistant" ? "assistant" : "user",
          content: typeof msg.content === "string" ? msg.content : "",
          timestamp: toDate(msg.timestamp),
          imageUrl: typeof msg.imageUrl === "string" ? msg.imageUrl : undefined,
        }))
    : [];

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name : "New Conversation",
    isPinned: !!raw.isPinned,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    messages,
  };
}

function migrateLegacyMessages(raw: unknown): { sessions: ChatSession[]; activeSessionId: string } {
  const legacyMessages = Array.isArray(raw)
    ? raw
        .filter((msg) => msg && typeof msg === "object" && typeof msg.id === "string")
        .map((msg) => ({
          id: String(msg.id),
          role: (msg.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: typeof msg.content === "string" ? msg.content : "",
          timestamp: toDate(msg.timestamp),
          imageUrl: typeof msg.imageUrl === "string" ? msg.imageUrl : undefined,
        }))
    : [];

  const session = createSession("Recovered Conversation");
  session.messages = legacyMessages;
  session.updatedAt = legacyMessages.length > 0 ? legacyMessages[legacyMessages.length - 1].timestamp : new Date();
  return { sessions: [session], activeSessionId: session.id };
}

function hydrateStore(storageKey: string): { sessions: ChatSession[]; activeSessionId: string | null } {
  if (typeof window === "undefined") {
    const fallback = createSession();
    return { sessions: [fallback], activeSessionId: fallback.id };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      const fallback = createSession();
      return { sessions: [fallback], activeSessionId: fallback.id };
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return migrateLegacyMessages(parsed);
    }

    if (!parsed || typeof parsed !== "object" || parsed.version !== 2 || !Array.isArray(parsed.sessions)) {
      const fallback = createSession();
      return { sessions: [fallback], activeSessionId: fallback.id };
    }

    const sessions = parsed.sessions
      .map((session: any) => normalizeSession(session))
      .filter(Boolean) as ChatSession[];

    if (sessions.length === 0) {
      const fallback = createSession();
      return { sessions: [fallback], activeSessionId: fallback.id };
    }

    const activeSessionId =
      typeof parsed.activeSessionId === "string" && sessions.some((s) => s.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : sessions[0].id;

    return { sessions, activeSessionId };
  } catch {
    const fallback = createSession();
    return { sessions: [fallback], activeSessionId: fallback.id };
  }
}

function deriveSessionNameFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "New Conversation";
  const words = trimmed.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 48 ? `${words.slice(0, 45)}...` : words;
}

function isEmptyDraftSession(session: ChatSession): boolean {
  return session.name === "New Conversation" && session.messages.length === 0;
}

function dedupeEmptyDraftSessions(
  sessions: ChatSession[],
  preferredSessionId?: string | null
): ChatSession[] {
  const draftSessions = sessions.filter(isEmptyDraftSession);
  if (draftSessions.length <= 1) return sessions;

  const preferredDraft =
    preferredSessionId && draftSessions.find((session) => session.id === preferredSessionId)
      ? preferredSessionId
      : null;

  const keepDraftId =
    preferredDraft ||
    [...draftSessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].id;

  return sessions.filter((session) => !isEmptyDraftSession(session) || session.id === keepDraftId);
}

function makeSyncSignature(sessions: ChatSession[]): string {
  return JSON.stringify(
    sessions.map((session) => ({
      id: session.id,
      name: session.name,
      isPinned: session.isPinned,
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        imageUrl: msg.imageUrl || null,
        timestamp: msg.timestamp.toISOString(),
      })),
    }))
  );
}

function mergeMessagesByTimestamp(localMessages: ChatMessage[], remoteMessages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();

  for (const msg of remoteMessages) {
    byId.set(msg.id, msg);
  }

  for (const msg of localMessages) {
    const existing = byId.get(msg.id);
    if (!existing || msg.timestamp.getTime() >= existing.timestamp.getTime()) {
      byId.set(msg.id, msg);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function mergeSessionsByUpdatedAt(localSessions: ChatSession[], remoteSessions: ChatSession[]): ChatSession[] {
  const localById = new Map(localSessions.map((session) => [session.id, session]));
  const remoteById = new Map(remoteSessions.map((session) => [session.id, session]));
  const allIds = new Set<string>([...localById.keys(), ...remoteById.keys()]);

  const merged: ChatSession[] = [];

  for (const id of allIds) {
    const local = localById.get(id);
    const remote = remoteById.get(id);

    if (local && remote) {
      const localTime = local.updatedAt.getTime();
      const remoteTime = remote.updatedAt.getTime();

      if (localTime > remoteTime) {
        merged.push(local);
      } else if (remoteTime > localTime) {
        merged.push(remote);
      } else {
        const mergedMessages = mergeMessagesByTimestamp(local.messages, remote.messages);
        merged.push({
          ...remote,
          name: local.name || remote.name,
          isPinned: local.isPinned || remote.isPinned,
          messages: mergedMessages,
          updatedAt:
            mergedMessages.length > 0
              ? mergedMessages[mergedMessages.length - 1].timestamp
              : remote.updatedAt,
        });
      }
      continue;
    }

    if (local) merged.push(local);
    else if (remote) merged.push(remote);
  }

  return merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

async function loadRemoteSessions(userId: string): Promise<ChatSession[]> {
  const sb: any = supabase;
  const { data: sessionsRows, error: sessionsError } = await sb
    .from("ai_chat_sessions")
    .select("id, name, is_pinned, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (sessionsError || !sessionsRows || sessionsRows.length === 0) return [];

  const sessionIds = sessionsRows.map((row: any) => row.id);
  const { data: messagesRows, error: messagesError } = await sb
    .from("ai_chat_messages")
    .select("id, session_id, role, content, image_url, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (messagesError) return [];

  const groupedMessages = new Map<string, ChatMessage[]>();
  for (const row of messagesRows || []) {
    const list = groupedMessages.get(row.session_id) || [];
    list.push({
      id: row.id,
      role: row.role === "assistant" ? "assistant" : "user",
      content: row.content || "",
      imageUrl: row.image_url || undefined,
      timestamp: toDate(row.created_at),
    });
    groupedMessages.set(row.session_id, list);
  }

  return sessionsRows.map((row: any) => ({
    id: row.id,
    name: row.name || "New Conversation",
    isPinned: !!row.is_pinned,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    messages: groupedMessages.get(row.id) || [],
  }));
}

async function persistRemoteSessions(userId: string, localSessions: ChatSession[]): Promise<{ ok: boolean; mergedSessions?: ChatSession[] }> {
  const sb: any = supabase;

  const remoteSessions = await loadRemoteSessions(userId);
  const resolvedSessions = mergeSessionsByUpdatedAt(localSessions, remoteSessions);

  const sessionRows = resolvedSessions.map((session) => ({
    id: session.id,
    user_id: userId,
    name: session.name,
    is_pinned: session.isPinned,
    created_at: session.createdAt.toISOString(),
    updated_at: session.updatedAt.toISOString(),
  }));

  const { error: upsertSessionsError } = await sb
    .from("ai_chat_sessions")
    .upsert(sessionRows, { onConflict: "id" });

  if (upsertSessionsError) return { ok: false };

  for (const session of resolvedSessions) {
    await sb.from("ai_chat_messages").delete().eq("session_id", session.id);

    if (session.messages.length === 0) continue;
    const messageRows = session.messages.map((msg) => ({
      id: msg.id,
      session_id: session.id,
      role: msg.role,
      content: msg.content,
      image_url: msg.imageUrl || null,
      created_at: msg.timestamp.toISOString(),
    }));
    const { error: messageInsertError } = await sb.from("ai_chat_messages").insert(messageRows);
    if (messageInsertError) return { ok: false };
  }

  return { ok: true, mergedSessions: resolvedSessions };
}

export function useMedicalChat(options?: UseMedicalChatOptions) {
  const storageKey = options?.storageKey || DEFAULT_STORAGE_KEY;
  const userId = options?.userId;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ChatSyncStatus>("idle");
  const { language } = useLanguage();
  const abortRef = useRef(false);
  const sessionsRef = useRef<ChatSession[]>([]);
  const activeSessionIdRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);
  const serverReadyRef = useRef(false);
  const lastSyncedSignatureRef = useRef<string>("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryNonceRef = useRef(0);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const hydrated = hydrateStore(storageKey);
    setSessions(hydrated.sessions);
    setActiveSessionId(hydrated.activeSessionId);
    sessionsRef.current = hydrated.sessions;
    activeSessionIdRef.current = hydrated.activeSessionId;
    hasHydratedRef.current = true;
  }, [storageKey]);

  useEffect(() => {
    sessionsRef.current = sessions;
    activeSessionIdRef.current = activeSessionId;

    if (typeof window === "undefined") return;

    const payload: PersistedChatStore = {
      version: 2,
      activeSessionId,
      sessions: sessions.map((session) => ({
        id: session.id,
        name: session.name,
        isPinned: session.isPinned,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: session.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          imageUrl: msg.imageUrl,
        })),
      })),
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures.
    }
  }, [sessions, activeSessionId, storageKey]);

  useEffect(() => {
    let cancelled = false;
    if (!hasHydratedRef.current) return;

    const run = async () => {
      if (!userId) {
        serverReadyRef.current = false;
        setSyncStatus("idle");
        return;
      }

      setSyncStatus("syncing");

      const remoteSessions = await loadRemoteSessions(userId);
      if (cancelled) return;

      const resolvedSessions = dedupeEmptyDraftSessions(
        mergeSessionsByUpdatedAt(sessionsRef.current, remoteSessions),
        activeSessionIdRef.current
      );

      if (resolvedSessions.length > 0) {
        setSessions(resolvedSessions);
        sessionsRef.current = resolvedSessions;
        const existingActive = activeSessionIdRef.current;
        const nextActive =
          existingActive && resolvedSessions.some((session) => session.id === existingActive)
            ? existingActive
            : resolvedSessions[0].id;
        setActiveSessionId(nextActive);
        activeSessionIdRef.current = nextActive;
      } else {
        const fallback = createSession();
        setSessions([fallback]);
        sessionsRef.current = [fallback];
        setActiveSessionId(fallback.id);
        activeSessionIdRef.current = fallback.id;
      }

      lastSyncedSignatureRef.current = "";
      setSyncStatus("synced");

      serverReadyRef.current = true;
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userId, retryNonce]);

  useEffect(() => {
    if (!userId || !serverReadyRef.current) return;

    const sourceSessions = sessionsRef.current;
    const signature = makeSyncSignature(sourceSessions);
    if (signature === lastSyncedSignatureRef.current) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(async () => {
      setSyncStatus("syncing");
      const result = await persistRemoteSessions(userId, sourceSessions);
      if (result.ok && result.mergedSessions) {
        const mergedSignature = makeSyncSignature(result.mergedSessions);
        lastSyncedSignatureRef.current = mergedSignature;
        sessionsRef.current = result.mergedSessions;

        if (makeSyncSignature(sessions) !== mergedSignature) {
          setSessions(result.mergedSessions);
        }

        const currentActive = activeSessionIdRef.current;
        if (currentActive && !result.mergedSessions.some((session) => session.id === currentActive)) {
          const nextActive = result.mergedSessions[0]?.id || null;
          setActiveSessionId(nextActive);
          activeSessionIdRef.current = nextActive;
        }

        setSyncStatus("synced");
      } else {
        setSyncStatus("retry");
      }
    }, 800);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [sessions, userId]);

  const retrySync = useCallback(() => {
    if (!userId) return;
    lastSyncedSignatureRef.current = "";
    retryNonceRef.current += 1;
    setRetryNonce(retryNonceRef.current);
  }, [userId]);

  const ensureActiveSession = useCallback(() => {
    let sessionId = activeSessionIdRef.current;
    if (sessionId && sessionsRef.current.some((session) => session.id === sessionId)) {
      return sessionId;
    }

    const fallbackSession = createSession();
    sessionsRef.current = [fallbackSession, ...sessionsRef.current];
    activeSessionIdRef.current = fallbackSession.id;
    setSessions((prev) => [fallbackSession, ...prev]);
    setActiveSessionId(fallbackSession.id);
    return fallbackSession.id;
  }, []);

  const upsertSession = useCallback((sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return updater(session);
      })
    );
  }, []);

  const createNewSession = useCallback((name?: string) => {
    // Reuse an existing empty "New Conversation" instead of duplicating.
    if (!name) {
      const existing = sessionsRef.current.find(
        (s) => s.name === "New Conversation" && s.messages.length === 0
      );
      if (existing) {
        setActiveSessionId(existing.id);
        activeSessionIdRef.current = existing.id;
        return existing.id;
      }
    }

    const session = createSession(name || "New Conversation");
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session.id;
  }, []);

  const renameSession = useCallback((sessionId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    upsertSession(sessionId, (session) => ({
      ...session,
      name: trimmed,
      updatedAt: new Date(),
    }));
  }, [upsertSession]);

  const toggleSessionPinned = useCallback((sessionId: string) => {
    upsertSession(sessionId, (session) => ({
      ...session,
      isPinned: !session.isPinned,
      updatedAt: new Date(),
    }));
  }, [upsertSession]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== sessionId);
      if (next.length > 0) {
        const nextActive = activeSessionIdRef.current === sessionId ? next[0].id : activeSessionIdRef.current;
        setActiveSessionId(nextActive || next[0].id);
        return next;
      }

      const fallback = createSession();
      setActiveSessionId(fallback.id);
      return [fallback];
    });
  }, []);

  const clearChat = useCallback(async () => {
    abortRef.current = true;
    setIsLoading(false);

    // Explicitly clear remote history to prevent merged sync from restoring old sessions.
    if (userId) {
      setSyncStatus("syncing");
      const sb: any = supabase;
      const { error } = await sb.from("ai_chat_sessions").delete().eq("user_id", userId);
      if (error) {
        setSyncStatus("retry");
        toast({
          title: "Failed to clear remote history",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const fallback = createSession();
    setSessions([fallback]);
    sessionsRef.current = [fallback];
    setActiveSessionId(fallback.id);
    activeSessionIdRef.current = fallback.id;
    lastSyncedSignatureRef.current = "";

    if (userId) {
      setSyncStatus("synced");
    }
  }, [userId]);

  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
    const sessionId = ensureActiveSession();
    const now = new Date();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: now,
      imageUrl,
    };

    const currentSession = sessionsRef.current.find((session) => session.id === sessionId);
    const previousMessages = currentSession?.messages || [];

    upsertSession(sessionId, (session) => ({
      ...session,
      name:
        session.messages.length === 0 && session.name === "New Conversation"
          ? deriveSessionNameFromPrompt(content)
          : session.name,
      messages: [...session.messages, userMsg],
      updatedAt: now,
    }));

    setIsLoading(true);
    abortRef.current = false;

    let assistantSoFar = "";
    const assistantId = crypto.randomUUID();

    const apiMessages = [...previousMessages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.imageUrl
        ? [
            { type: "text" as const, text: m.content },
            { type: "image_url" as const, image_url: { url: m.imageUrl } },
          ]
        : m.content,
    }));

    await streamMedicalChat({
      messages: apiMessages as any,
      language,
      onDelta: (chunk) => {
        if (abortRef.current) return;
        assistantSoFar += chunk;
        const deltaTime = new Date();

        upsertSession(sessionId, (session) => {
          const last = session.messages[session.messages.length - 1];
          if (last?.id === assistantId) {
            return {
              ...session,
              messages: session.messages.map((m) =>
                m.id === assistantId ? { ...m, content: assistantSoFar, timestamp: deltaTime } : m
              ),
              updatedAt: deltaTime,
            };
          }

          return {
            ...session,
            messages: [
              ...session.messages,
              {
                id: assistantId,
                role: "assistant" as const,
                content: assistantSoFar,
                timestamp: deltaTime,
              },
            ],
            updatedAt: deltaTime,
          };
        });
      },
      onDone: () => setIsLoading(false),
      onError: (error) => {
        setIsLoading(false);
        toast({ title: "AI Error", description: error, variant: "destructive" });
      },
    });
  }, [language, ensureActiveSession, upsertSession]);

  const messages = useMemo(() => {
    const active = sessions.find((session) => session.id === activeSessionId);
    return active?.messages || [];
  }, [sessions, activeSessionId]);

  return {
    messages,
    sessions,
    activeSessionId,
    isLoading,
    syncStatus,
    setActiveSessionId,
    createNewSession,
    renameSession,
    toggleSessionPinned,
    deleteSession,
    sendMessage,
    clearChat,
    retrySync,
  };
}
