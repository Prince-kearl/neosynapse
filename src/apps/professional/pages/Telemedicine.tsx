import { useState, useCallback } from "react";
import { Video, Users, Loader2, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoDisplay } from "@/components/telemedicine/VideoDisplay";
import { CallControls } from "@/components/telemedicine/CallControls";
import { PreConsultationSettings } from "@/components/telemedicine/PreConsultationSettings";

type CallState = "list" | "pre-call" | "joining" | "active" | "ended" | "error";

export default function ProfessionalTelemedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [callState, setCallState] = useState<CallState>("list");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Patient");

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
      if (s === "connected") setCallState("active");
      if (s === "failed") {
        setCallState("error");
        setErrorMessage("Connection failed. The patient may have left.");
      }
      if (s === "disconnected") {
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

  const getPatientName = (id: string) => {
    const p = profiles.find((pr) => pr.user_id === id);
    return p?.full_name || p?.display_name || "Patient";
  };

  const getWaitTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "Just now";
    return `${diff} min`;
  };

  /** Open pre-call settings for an encounter */
  const handleSelectEncounter = useCallback((encounterId: string, patientId: string) => {
    setSelectedEncounterId(encounterId);
    setPatientName(getPatientName(patientId));
    setCallState("pre-call");
    setErrorMessage(null);
  }, [profiles]);

  /** Find the consultation room for this encounter's patient and join */
  const handleJoinCall = useCallback(async () => {
    if (!user || !selectedEncounterId) return;
    setCallState("joining");
    setErrorMessage(null);

    try {
      // Find the encounter to get the patient_id
      const encounter = waitingEncounters.find(e => e.id === selectedEncounterId);
      if (!encounter) {
        setCallState("error");
        setErrorMessage("Encounter not found");
        return;
      }

      // Look for an active consultation room created by this patient for this professional
      // TODO: For a production system, link consultation_rooms to encounters via encounter_id column
      const { data: rooms, error: roomErr } = await supabase
        .from("consultation_rooms")
        .select("*")
        .eq("doctor_id", user.id)
        .eq("created_by", encounter.patient_id)
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (roomErr || !rooms || rooms.length === 0) {
        // No room yet — the patient hasn't started the call
        // Create a room and wait for the patient to connect
        // TODO: In production, the patient should initiate the room. For now, show a clear message.
        setCallState("error");
        setErrorMessage(
          "No active session found. The patient needs to start the video call first. " +
          "Please ask the patient to initiate the telemedicine session from their portal."
        );
        return;
      }

      const room = rooms[0];
      setRoomId(room.id);

      // Update encounter status to in_progress
      await supabase
        .from("encounters")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", selectedEncounterId);

      // Join the WebRTC call (answer the offer)
      // Small delay to allow roomId state to propagate
      setTimeout(async () => {
        await joinCall(videoEnabled, audioEnabled);
      }, 100);
    } catch (err) {
      console.error("Error joining call:", err);
      setCallState("error");
      setErrorMessage("Failed to join the call. Please try again.");
    }
  }, [user, selectedEncounterId, waitingEncounters, videoEnabled, audioEnabled, joinCall]);

  // Need roomId to be set before joinCall runs — use effect-based approach
  const handleJoinWithRoom = useCallback(async () => {
    if (!roomId) return;
    await joinCall(videoEnabled, audioEnabled);
  }, [roomId, videoEnabled, audioEnabled, joinCall]);

  const handleEndCall = useCallback(async () => {
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
    setCallState("list");
    setSelectedEncounterId(null);
    setRoomId(null);
    setErrorMessage(null);
    refetch();
  }, [refetch]);

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
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleBackToList}>
              Back to Waiting List
            </Button>
            <Button onClick={() => navigate("/professional/notes")}>
              Write Notes
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Waiting Patients
            </h2>
            <Badge variant="outline">{waitingEncounters.length} waiting</Badge>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : waitingEncounters.length > 0 ? (
            <div className="space-y-3">
              {waitingEncounters.map((enc) => (
                <div key={enc.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {getPatientName(enc.patient_id).charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{getPatientName(enc.patient_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {enc.status === "in_progress" ? "In progress" : "Waiting"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {getWaitTime(enc.created_at)}
                    </span>
                    <Badge variant="outline" className={
                      enc.status === "in_progress" ? "border-primary/50 text-primary" : "border-yellow-500/50 text-yellow-500"
                    }>
                      {enc.status.replace("_", " ")}
                    </Badge>
                    <Button onClick={() => handleSelectEncounter(enc.id, enc.patient_id)}>
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
