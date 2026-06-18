import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSttResponse } from "@/shared/lib/consultationArtifacts";

type RecorderState = "idle" | "waiting-for-audio" | "recording" | "processing" | "saved" | "error";

interface UseConsultationRecorderOptions {
  enabled: boolean;
  encounterId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onTranscriptSaved?: (transcriptId: string) => void;
  onError?: (message: string) => void;
}

const pickSupportedMimeType = () => {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

export function useConsultationRecorder({
  enabled,
  encounterId,
  localStream,
  remoteStream,
  onTranscriptSaved,
  onError,
}: UseConsultationRecorderOptions) {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceNodesRef = useRef<MediaStreamAudioSourceNode[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const hasSavedRef = useRef(false);

  const cleanupAudioGraph = useCallback(() => {
    sourceNodesRef.current.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect errors during browser cleanup.
      }
    });
    sourceNodesRef.current = [];
    destinationRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    recorderRef.current = null;
    chunksRef.current = [];
    startTimeRef.current = null;
    hasSavedRef.current = false;
    setTranscriptId(null);
    setErrorMessage(null);
    setState("idle");
    cleanupAudioGraph();
  }, [cleanupAudioGraph]);

  const start = useCallback(async () => {
    if (!enabled || !encounterId || recorderRef.current || hasSavedRef.current) return;
    if (typeof MediaRecorder === "undefined") {
      setState("error");
      setErrorMessage("Audio recording is not supported in this browser.");
      onError?.("Audio recording is not supported in this browser.");
      return;
    }

    setState("waiting-for-audio");

    const waitForTracks = async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const localAudioTracks = localStream?.getAudioTracks().filter((track) => track.readyState === "live") || [];
        const remoteAudioTracks = remoteStream?.getAudioTracks().filter((track) => track.readyState === "live") || [];
        if (localAudioTracks.length + remoteAudioTracks.length > 0) {
          return { localAudioTracks, remoteAudioTracks };
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return { localAudioTracks: [], remoteAudioTracks: [] };
    };

    const { localAudioTracks, remoteAudioTracks } = await waitForTracks();
    if (localAudioTracks.length + remoteAudioTracks.length === 0) {
      setState("error");
      setErrorMessage("No consultation audio was available to record.");
      onError?.("No consultation audio was available to record.");
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error("AudioContext is not supported in this browser.");

      const audioContext = new AudioCtx();
      const destination = audioContext.createMediaStreamDestination();
      audioContextRef.current = audioContext;
      destinationRef.current = destination;

      const connectStream = (stream: MediaStream | null, tracks: MediaStreamTrack[]) => {
        if (!stream || tracks.length === 0) return;
        const audioOnlyStream = new MediaStream(tracks);
        const source = audioContext.createMediaStreamSource(audioOnlyStream);
        source.connect(destination);
        sourceNodesRef.current.push(source);
      };

      connectStream(localStream, localAudioTracks);
      connectStream(remoteStream, remoteAudioTracks);

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setState("error");
        setErrorMessage("Consultation recording failed.");
        onError?.("Consultation recording failed.");
      };

      recorder.start(1000);
      setState("recording");
    } catch (error) {
      console.error("Failed to start consultation recorder:", error);
      cleanupAudioGraph();
      const message = error instanceof Error ? error.message : "Could not start consultation recording.";
      setState("error");
      setErrorMessage(message);
      onError?.(message);
    }
  }, [cleanupAudioGraph, encounterId, enabled, localStream, onError, remoteStream]);

  const stopAndSave = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || hasSavedRef.current) return null;

    if (recorder.state === "inactive" && chunksRef.current.length === 0) return null;

    setState("processing");
    hasSavedRef.current = true;

    if (recorder.state !== "inactive") {
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.stop();
      await stopped;
    }
    cleanupAudioGraph();

    if (!encounterId || chunksRef.current.length === 0) {
      setState("idle");
      return null;
    }

    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const fileExtension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("audio", blob, `consultation-${encounterId}.${fileExtension}`);

      const { data: sttData, error: sttError } = await supabase.functions.invoke("speech-to-text", {
        body: formData,
      });

      if (sttError) throw sttError;

      const transcriptJson = normalizeSttResponse(sttData);
      if (startTimeRef.current) {
        transcriptJson.duration_seconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("transcripts")
        .insert({
          encounter_id: encounterId,
          transcript_json: transcriptJson as any,
          speaker_map: {
            speaker_1: "Patient / Professional",
            note: "Automatic speaker separation may require clinician review.",
          },
        })
        .select("id")
        .single();

      if (insertError || !inserted) throw insertError || new Error("Transcript was not saved.");

      setTranscriptId(inserted.id);
      setState("saved");
      onTranscriptSaved?.(inserted.id);
      return inserted.id;
    } catch (error) {
      console.error("Failed to process consultation recording:", error);
      const message = error instanceof Error ? error.message : "Could not transcribe and save the consultation.";
      setState("error");
      setErrorMessage(message);
      onError?.(message);
      return null;
    } finally {
      chunksRef.current = [];
      recorderRef.current = null;
      startTimeRef.current = null;
    }
  }, [cleanupAudioGraph, encounterId, onError, onTranscriptSaved]);

  useEffect(() => {
    if (enabled && encounterId) {
      void start();
    }
  }, [enabled, encounterId, start]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      cleanupAudioGraph();
    };
  }, [cleanupAudioGraph]);

  return {
    recorderState: state,
    transcriptId,
    errorMessage,
    stopAndSave,
    reset,
  };
}
