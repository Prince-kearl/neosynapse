import { useState, useCallback, useRef, useEffect } from "react";
import { Video, Users, Loader2, Phone, AlertCircle, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { auditLogService } from "@/shared/services/healthcare";
import { VideoDisplay } from "@/components/telemedicine/VideoDisplay";
import { CallControls } from "@/components/telemedicine/CallControls";
import { PreConsultationSettings } from "@/components/telemedicine/PreConsultationSettings";
import { toast } from "@/hooks/use-toast";

type CallState = "list" | "pre-call" | "joining" | "active" | "ended" | "error";

export default function ProfessionalTelemedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ROLLBACK_WINDOW_MS = 10_000;

  const [callState, setCallState] = useState<CallState>("list");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Patient");
  const selectedEncounterRef = useRef<string | null>(null);
  const hasMarkedInProgressRef = useRef(false);
  const connectedAtRef = useRef<number | null>(null);
  const intentionalEndRef = useRef(false);
  const consumedDeepLinkRef = useRef<string | null>(null);
  const previousPendingEncounterIdsRef = useRef<Set<string>>(new Set());
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringAudioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockListenersAttachedRef = useRef(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const ringingPatientNameRef = useRef<string>("Patient");
  const [ringingEncounterId, setRingingEncounterId] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
  const isSnoozed = snoozeUntil !== null && snoozeUntil > Date.now();
  const snoozeRemainingSec = isSnoozed ? Math.max(1, Math.ceil((snoozeUntil! - Date.now()) / 1000)) : 0;

  const ensureAudioContext = useCallback(async () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!ringAudioContextRef.current) {
      ringAudioContextRef.current = new AudioCtx();
    }

    const ctx = ringAudioContextRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    return ctx;
  }, []);

  const playRingTone = useCallback(async () => {
    try {
      const ctx = await ensureAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const ringBeep = (offset: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.34);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.36);
      };

      ringBeep(0, 880);
      ringBeep(0.38, 988);
      setAudioUnlocked(true);
    } catch {
      // Some browsers require a user interaction before audio playback.
    }
  }, [ensureAudioContext]);

  const stopRinging = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
    setRingingEncounterId(null);
  }, []);

  const pushIncomingNotification = useCallback((encounterId: string, patient: string, persistent: boolean) => {
    if (!("Notification" in window)) return;

    const show = () => {
      new Notification("Incoming Telemedicine Call", {
        body: `${patient} is waiting for consultation.`,
        tag: `telemedicine-incoming-${encounterId}`,
        renotify: true,
        requireInteraction: persistent,
      });
    };

    if (Notification.permission === "granted") {
      show();
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          show();
        }
      });
    }
  }, []);

  const startNotificationLoop = useCallback((encounterId: string, patient: string) => {
    pushIncomingNotification(encounterId, patient, true);

    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }

    notificationIntervalRef.current = setInterval(() => {
      // Keep background alerts noticeable, especially where audio is throttled.
      pushIncomingNotification(encounterId, patient, true);
      if ("vibrate" in navigator) {
        navigator.vibrate?.([220, 100, 220]);
      }
    }, 12000);
  }, [pushIncomingNotification]);

  const startRingingForEncounter = useCallback((encounterId: string, patient: string) => {
    if (isSnoozed) return;

    setRingingEncounterId(encounterId);
    ringingPatientNameRef.current = patient;

    void playRingTone();
    if (!audioUnlocked) {
      toast({
        title: "Enable ringtone",
        description: "Tap anywhere once to allow call ringtone sound.",
      });
    }
    if (!ringIntervalRef.current) {
      ringIntervalRef.current = setInterval(() => {
        void playRingTone();
      }, 2600);
    }

    if ("vibrate" in navigator) {
      navigator.vibrate?.([220, 100, 220]);
    }

    // Notification-first behavior in background tabs.
    if (document.hidden) {
      startNotificationLoop(encounterId, patient);
    } else {
      pushIncomingNotification(encounterId, patient, false);
    }

    toast({
      title: "Incoming call",
      description: `${patient} started a telemedicine consultation.`,
    });
  }, [isSnoozed, playRingTone, pushIncomingNotification, startNotificationLoop, audioUnlocked]);

  const handleSnoozeOneMinute = useCallback(() => {
    setSnoozeUntil(Date.now() + 60_000);
    stopRinging();
    toast({
      title: "Alerts snoozed",
      description: "Incoming call alerts paused for 1 minute.",
    });
  }, [stopRinging]);

  // One-time audio unlock: browsers often require explicit user interaction before sound playback.
  useEffect(() => {
    if (audioUnlockListenersAttachedRef.current) return;

    const unlockAudio = async () => {
      try {
        const ctx = await ensureAudioContext();
        if (ctx) {
          // Tiny silent buffer to finalize unlock path on iOS/Safari.
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          setAudioUnlocked(true);
        }
      } catch {
        // Ignore unlock errors.
      }
    };

    const opts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("pointerdown", unlockAudio, opts);
    window.addEventListener("touchstart", unlockAudio, opts);
    window.addEventListener("keydown", unlockAudio, opts);
    audioUnlockListenersAttachedRef.current = true;

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      audioUnlockListenersAttachedRef.current = false;
    };
  }, [ensureAudioContext]);

  const rollbackEncounterToPending = useCallback((encounterId: string, signalState: "failed" | "disconnected") => {
    hasMarkedInProgressRef.current = false;
    connectedAtRef.current = null;

    void supabase
      .from("encounters")
      .update({ status: "pending", started_at: null })
      .eq("id", encounterId)
      .then(async ({ error }) => {
        if (error) {
          console.error("Failed to rollback encounter status:", error);
          return;
        }

        if (!user?.id) return;

        const { error: auditError } = await auditLogService.log({
          actor_id: user.id,
          action: "encounter_status_rollback",
          entity_type: "encounter",
          entity_id: encounterId,
          metadata: {
            reason: "rapid_disconnect_after_connect",
            signal_state: signalState,
            rolled_back_to: "pending",
          },
        });

        if (auditError) {
          console.error("Failed to write rollback audit log:", auditError);
        }
      });
  }, [user?.id]);

  const {
    connectionState,
    localStream,
    remoteStream,
    joinCall,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useWebRTC({
    roomId,
    userId: user?.id || "",
    onConnectionStateChange: (s) => {
      if (s === "connected") {
        setCallState("active");
        connectedAtRef.current = Date.now();
        intentionalEndRef.current = false;
        const encounterToMark = selectedEncounterRef.current;
        if (encounterToMark && !hasMarkedInProgressRef.current) {
          hasMarkedInProgressRef.current = true;
          void supabase
            .from("encounters")
            .update({ status: "in_progress", started_at: new Date().toISOString() })
            .eq("id", encounterToMark)
            .then(({ error }) => {
              if (error) {
                console.error("Failed to mark encounter in progress:", error);
              }
            });
        }
      }
      if (s === "failed") {
        const encounterToRollback = selectedEncounterRef.current;
        const connectedAt = connectedAtRef.current;
        const shouldRollback =
          !!encounterToRollback &&
          hasMarkedInProgressRef.current &&
          !intentionalEndRef.current &&
          !!connectedAt &&
          Date.now() - connectedAt <= ROLLBACK_WINDOW_MS;

        if (shouldRollback) {
          rollbackEncounterToPending(encounterToRollback, "failed");
        }

        setCallState("error");
        setErrorMessage("Connection failed. The patient may have left.");
      }
      if (s === "disconnected") {
        const encounterToRollback = selectedEncounterRef.current;
        const connectedAt = connectedAtRef.current;
        const shouldRollback =
          !!encounterToRollback &&
          hasMarkedInProgressRef.current &&
          !intentionalEndRef.current &&
          !!connectedAt &&
          Date.now() - connectedAt <= ROLLBACK_WINDOW_MS;

        if (shouldRollback) {
          rollbackEncounterToPending(encounterToRollback, "disconnected");
        }

        setCallState("ended");
      }
    },
  });

  // Fetch active telemedicine encounters for this professional
  const { data: waitingEncounters = [], isLoading, refetch } = useQuery({
    queryKey: ["pro-tele-waiting", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encounters")
        .select("*")
        .eq("professional_id", user!.id)
        .eq("encounter_type", "telemedicine")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10s for new patients
  });

  // Realtime sync so new patient calls appear immediately without waiting for poll.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`pro-tele-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "encounters",
          filter: `professional_id=eq.${user.id}`,
        },
        () => {
          void refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consultation_rooms",
          filter: `doctor_id=eq.${user.id}`,
        },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, refetch]);

  // Fetch patient names
  const patientIds = [...new Set(waitingEncounters.map((e) => e.patient_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["pro-tele-profiles", patientIds],
    queryFn: async () => {
      if (patientIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, full_name")
        .in("user_id", patientIds);
      return data || [];
    },
    enabled: patientIds.length > 0,
  });

  const getPatientName = useCallback((id: string) => {
    const p = profiles.find((pr) => pr.user_id === id);
    return p?.full_name || p?.display_name || "Patient";
  }, [profiles]);

  const getWaitTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "Just now";
    return `${diff} min`;
  };

  /** Open pre-call settings for an encounter */
  const handleSelectEncounter = useCallback((encounterId: string, patientId: string) => {
    stopRinging();
    setSelectedEncounterId(encounterId);
    selectedEncounterRef.current = encounterId;
    hasMarkedInProgressRef.current = false;
    connectedAtRef.current = null;
    intentionalEndRef.current = false;
    setPatientName(getPatientName(patientId));
    setCallState("pre-call");
    setErrorMessage(null);
  }, [getPatientName, stopRinging]);

  useEffect(() => {
    const deepLinkedEncounterId = searchParams.get("encounterId")?.trim() || null;
    const deepLinkAction = searchParams.get("action")?.trim() || null;
    if (!deepLinkedEncounterId) return;
    if (callState !== "list") return;
    if (consumedDeepLinkRef.current === `${deepLinkedEncounterId}|${deepLinkAction}`) return;

    const targetEncounter = waitingEncounters.find((enc) => enc.id === deepLinkedEncounterId);
    if (!targetEncounter) return;

    consumedDeepLinkRef.current = `${deepLinkedEncounterId}|${deepLinkAction}`;

    if (deepLinkAction === "reject") {
      void supabase
        .from("encounters")
        .update({ status: "cancelled", ended_at: new Date().toISOString() })
        .eq("id", targetEncounter.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to reject telemedicine encounter:", error);
            toast({ title: "Unable to reject call", description: "Please try again.", variant: "destructive" });
            return;
          }
          toast({ title: "Call rejected", description: `You rejected ${getPatientName(targetEncounter.patient_id)}'s telemedicine request.` });
        });
      return;
    }

    handleSelectEncounter(targetEncounter.id, targetEncounter.patient_id);

    if (deepLinkAction === "accept") {
      void joinEncounter(targetEncounter.id);
    }
  }, [searchParams, callState, waitingEncounters, handleSelectEncounter, joinEncounter, getPatientName]);

  useEffect(() => {
    if (!snoozeUntil) return;
    const timeout = setTimeout(() => {
      setSnoozeUntil(null);
    }, Math.max(0, snoozeUntil - Date.now()));
    return () => clearTimeout(timeout);
  }, [snoozeUntil]);

  // Ring the professional when new pending encounters arrive.
  useEffect(() => {
    const pendingEncounters = waitingEncounters.filter((enc) => enc.status === "pending");
    const currentIds = new Set(pendingEncounters.map((enc) => enc.id));

    if (callState !== "list") {
      stopRinging();
      previousPendingEncounterIdsRef.current = currentIds;
      return;
    }

    if (isSnoozed) {
      previousPendingEncounterIdsRef.current = currentIds;
      return;
    }

    const previousIds = previousPendingEncounterIdsRef.current;
    const incoming = pendingEncounters.find((enc) => !previousIds.has(enc.id));
    previousPendingEncounterIdsRef.current = currentIds;

    if (incoming) {
      startRingingForEncounter(incoming.id, getPatientName(incoming.patient_id));
      return;
    }

    if (ringingEncounterId && !currentIds.has(ringingEncounterId)) {
      stopRinging();
    }
  }, [waitingEncounters, callState, getPatientName, ringingEncounterId, startRingingForEncounter, stopRinging, isSnoozed]);

  // If snooze ends and there is still a pending patient, alert again.
  useEffect(() => {
    if (callState !== "list" || isSnoozed || ringingEncounterId) return;
    const pending = waitingEncounters.find((enc) => enc.status === "pending");
    if (!pending) return;
    startRingingForEncounter(pending.id, getPatientName(pending.patient_id));
  }, [callState, isSnoozed, ringingEncounterId, waitingEncounters, startRingingForEncounter, getPatientName]);

  // Background tab behavior: prioritize persistent notifications while hidden.
  useEffect(() => {
    if (!ringingEncounterId) return;

    const onVisibilityChange = () => {
      if (!ringingEncounterId) return;
      if (document.hidden) {
        startNotificationLoop(ringingEncounterId, ringingPatientNameRef.current);
      } else if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    onVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ringingEncounterId, startNotificationLoop]);

  /** Find the consultation room for this encounter's patient and join */
  const joinEncounter = useCallback(async (targetEncounterId: string) => {
    if (!user || !targetEncounterId) return;
    stopRinging();
    setCallState("joining");
    setErrorMessage(null);

    try {
      // Find the encounter to get the patient_id
      const encounter = waitingEncounters.find(e => e.id === targetEncounterId);
      if (!encounter) {
        setCallState("error");
        setErrorMessage("Encounter not found");
        return;
      }

      // Look for an active consultation room for this exact encounter
      const { data: rooms, error: roomErr } = await supabase
        .from("consultation_rooms")
        .select("*")
        .eq("encounter_id", encounter.id)
        .eq("doctor_id", user.id)
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (roomErr || !rooms || rooms.length === 0) {
        // No room yet — patient has not initiated this encounter's telemedicine room.
        setCallState("error");
        setErrorMessage(
          "No session found for this encounter. Ask the patient to start the telemedicine call from their portal first."
        );
        return;
      }

      const room = rooms[0];
      setRoomId(room.id);

      // Join the WebRTC call (answer the offer)
      await joinCall(videoEnabled, audioEnabled, room.id);
    } catch (err) {
      console.error("Error joining call:", err);
      setCallState("error");
      setErrorMessage("Failed to join the call. Please try again.");
    }
  }, [user, selectedEncounterId, waitingEncounters, videoEnabled, audioEnabled, joinCall, stopRinging]);

  const handleEndCall = useCallback(async () => {
    intentionalEndRef.current = true;
    await endCall();
    setCallState("ended");

    // Update encounter
    if (selectedEncounterId) {
      await supabase
        .from("encounters")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", selectedEncounterId);
    }
  }, [endCall, selectedEncounterId]);

  const handleJoinCall = useCallback(async () => {
    if (!selectedEncounterId) return;
    await joinEncounter(selectedEncounterId);
  }, [joinEncounter, selectedEncounterId]);

  const handleToggleVideo = useCallback(() => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    toggleVideo(next);
  }, [videoEnabled, toggleVideo]);

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    toggleAudio(next);
  }, [audioEnabled, toggleAudio]);

  const handleBackToList = useCallback(() => {
    stopRinging();
    setCallState("list");
    setSelectedEncounterId(null);
    selectedEncounterRef.current = null;
    hasMarkedInProgressRef.current = false;
    connectedAtRef.current = null;
    intentionalEndRef.current = false;
    setRoomId(null);
    setErrorMessage(null);
    refetch();
  }, [refetch, stopRinging]);

  useEffect(() => {
    return () => {
      stopRinging();
      if (ringAudioContextRef.current) {
        void ringAudioContextRef.current.close();
        ringAudioContextRef.current = null;
      }
    };
  }, [stopRinging]);

  const getEncounterContextPath = useCallback((basePath: string) => {
    if (!selectedEncounterRef.current) return basePath;
    return `${basePath}?encounterId=${selectedEncounterRef.current}`;
  }, []);

  // ─── Active call view ──────────────────────────────────────────
  if (callState === "active" || (callState === "joining" && connectionState === "connected")) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col">
        <VideoDisplay
          localStream={localStream}
          remoteStream={remoteStream}
          videoEnabled={videoEnabled}
          connectionState={connectionState}
          doctorName={patientName}
          consentRecording={false}
        />
        <CallControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
          onOpenChat={() => navigate(getEncounterContextPath("/professional/transcripts"))}
          onOpenNotes={() => navigate(getEncounterContextPath("/professional/notes"))}
        />
      </div>
    );
  }

  // ─── Joining / connecting view ─────────────────────────────────
  if (callState === "joining") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold">Connecting to Patient</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Joining {patientName}'s session…
          </p>
          <Button variant="outline" onClick={() => { endCall(); handleBackToList(); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ─── Error view ────────────────────────────────────────────────
  if (callState === "error") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold">Unable to Join</h2>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <Button variant="outline" onClick={handleBackToList}>
            Back to Waiting List
          </Button>
        </div>
      </div>
    );
  }

  // ─── Ended view ────────────────────────────────────────────────
  if (callState === "ended") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Phone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold">Consultation Ended</h2>
          <p className="text-muted-foreground text-sm">
            The session with {patientName} has ended. You can now write clinical notes for this encounter.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleBackToList}>
              Back to Waiting List
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => navigate(getEncounterContextPath("/professional/notes"))}>
              Write Notes
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => navigate(getEncounterContextPath("/professional/transcripts"))}>
              Review Transcript
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pre-call settings view ────────────────────────────────────
  if (callState === "pre-call") {
    return (
      <div className="flex-1 min-h-screen bg-background">
        <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold mb-2">Join Consultation</h1>
            <p className="text-muted-foreground">
              Connecting with <span className="font-medium text-foreground">{patientName}</span>
            </p>
          </div>

          <PreConsultationSettings
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            consentRecording={false}
            onVideoChange={setVideoEnabled}
            onAudioChange={setAudioEnabled}
            onConsentChange={() => {}}
            showConsent={false}
          />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-full" onClick={handleBackToList}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-semibold"
              onClick={handleJoinCall}
            >
              <Video className="w-5 h-5 mr-2" />
              Join Call
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Waiting list view (default) ──────────────────────────────
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Telemedicine Console</h1>
          <p className="text-muted-foreground">Manage video consultations with patients</p>
        </div>

        {/* Waiting Patients */}
        <section className="bg-card rounded-2xl p-5 border border-border">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Waiting Patients
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {ringingEncounterId ? (
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={stopRinging}>
                    <BellOff className="w-3.5 h-3.5 mr-1" />
                    Mute Alert
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={handleSnoozeOneMinute}>
                    Snooze 1 min
                  </Button>
                </>
              ) : isSnoozed ? (
                <Badge variant="outline" className="gap-1">
                  <BellOff className="w-3.5 h-3.5" />
                  Snoozed {snoozeRemainingSec}s
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Bell className="w-3.5 h-3.5" />
                  Alerts On
                </Badge>
              )}
              <Badge variant="outline">{waitingEncounters.length} waiting</Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : waitingEncounters.length > 0 ? (
            <div className="space-y-3">
              {waitingEncounters.map((enc) => (
                <div key={enc.id} className="flex flex-col gap-3 rounded-xl bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {getPatientName(enc.patient_id).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{getPatientName(enc.patient_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {enc.status === "in_progress" ? "In progress" : "Waiting"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      {getWaitTime(enc.created_at)}
                    </span>
                    <Badge variant="outline" className={
                      enc.status === "in_progress"
                        ? "border-primary/50 text-primary capitalize"
                        : "border-yellow-500/50 text-yellow-500 capitalize"
                    }>
                      {enc.status.replace("_", " ")}
                    </Badge>
                    <Button className="w-full sm:w-auto" onClick={() => handleSelectEncounter(enc.id, enc.patient_id)}>
                      <Video className="w-4 h-4 mr-2" />
                      Join Call
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No patients waiting</p>
              <p className="text-xs text-muted-foreground mt-1">
                Patients will appear here when they start a telemedicine session assigned to you.
              </p>
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-muted/50 rounded-2xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> When you join a call, the patient's video feed will appear.
            Ensure your camera and microphone are enabled. If recording consent was granted,
            the consultation will be transcribed for clinical documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
