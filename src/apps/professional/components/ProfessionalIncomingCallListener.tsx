import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileNames } from "@/shared/hooks/useHealthcare";
import { supabase } from "@/integrations/supabase/client";

export function ProfessionalIncomingCallListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTelemedicinePage = location.pathname.startsWith("/professional/telemedicine");

  const previousPendingEncounterIdsRef = useRef<Set<string>>(new Set());
  const ringingEncounterIdRef = useRef<string | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringAudioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockListenersAttachedRef = useRef(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

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
      // Browser may block autoplay until user gesture.
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
    ringingEncounterIdRef.current = null;
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
        if (permission === "granted") show();
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
      pushIncomingNotification(encounterId, patient, true);
      if ("vibrate" in navigator) {
        navigator.vibrate?.([220, 100, 220]);
      }
    }, 12000);
  }, [pushIncomingNotification]);

  const { data: waitingEncounters = [], refetch } = useQuery({
    queryKey: ["pro-tele-alerts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encounters")
        .select("id, patient_id, status, created_at")
        .eq("professional_id", user!.id)
        .eq("encounter_type", "telemedicine")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !isTelemedicinePage,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user?.id || isTelemedicinePage) return;

    const channel = supabase
      .channel(`pro-incoming-call-listener-${user.id}`)
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
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, isTelemedicinePage, refetch]);

  const patientIds = useMemo(
    () => [...new Set(waitingEncounters.filter((e: any) => e.status === "pending").map((e: any) => e.patient_id))],
    [waitingEncounters],
  );
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const getPatientName = useCallback((patientId: string) => nameMap[patientId] || "Patient", [nameMap]);

  const startIncomingAlert = useCallback((encounterId: string, patient: string) => {
    ringingEncounterIdRef.current = encounterId;

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

    if (document.hidden) {
      startNotificationLoop(encounterId, patient);
    } else {
      pushIncomingNotification(encounterId, patient, false);
    }

    toast({
      title: "Incoming call",
      description: `${patient} started a telemedicine consultation.`,
      action: (
        <ToastAction altText="Open telemedicine" onClick={() => navigate(`/professional/telemedicine?encounterId=${encounterId}`)}>
          Open
        </ToastAction>
      ),
    });
  }, [audioUnlocked, navigate, playRingTone, pushIncomingNotification, startNotificationLoop]);

  // Unlock audio context once user interacts.
  useEffect(() => {
    if (audioUnlockListenersAttachedRef.current) return;

    const unlockAudio = async () => {
      try {
        const ctx = await ensureAudioContext();
        if (ctx) {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          setAudioUnlocked(true);
        }
      } catch {
        // ignore
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

  useEffect(() => {
    if (isTelemedicinePage) {
      stopRinging();
      previousPendingEncounterIdsRef.current = new Set();
      return;
    }

    const pendingEncounters = waitingEncounters.filter((enc: any) => enc.status === "pending");
    const currentIds = new Set(pendingEncounters.map((enc: any) => enc.id));
    const previousIds = previousPendingEncounterIdsRef.current;

    const incoming = pendingEncounters.find((enc: any) => !previousIds.has(enc.id));
    previousPendingEncounterIdsRef.current = currentIds;

    if (incoming) {
      startIncomingAlert(incoming.id, getPatientName(incoming.patient_id));
      return;
    }

    if (ringingEncounterIdRef.current && !currentIds.has(ringingEncounterIdRef.current)) {
      stopRinging();
    }
  }, [waitingEncounters, isTelemedicinePage, getPatientName, startIncomingAlert, stopRinging]);

  useEffect(() => {
    return () => {
      stopRinging();
      if (ringAudioContextRef.current) {
        void ringAudioContextRef.current.close();
        ringAudioContextRef.current = null;
      }
    };
  }, [stopRinging]);

  return null;
}
