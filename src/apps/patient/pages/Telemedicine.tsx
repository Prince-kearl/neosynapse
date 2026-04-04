// Patient Telemedicine - uses existing WebRTC infrastructure
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, Phone, Clock, Shield, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoDisplay } from "@/components/telemedicine/VideoDisplay";
import { CallControls } from "@/components/telemedicine/CallControls";
import { DoctorCard } from "@/components/telemedicine/DoctorCard";
import { PreConsultationSettings } from "@/components/telemedicine/PreConsultationSettings";
import { toast } from "@/hooks/use-toast";

type ConsultationState = "lobby" | "waiting" | "active" | "ended";

export default function PatientTelemedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ConsultationState>("lobby");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [consentRecording, setConsentRecording] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);

  const { data: professionalProfiles = [], isLoading: providersLoading } = useQuery({
    queryKey: ["telemedicine-professionals"],
    queryFn: async () => {
      const { data: pros, error: proErr } = await supabase
        .from("professional_profiles")
        .select("user_id, specialty, verification_status");
      if (proErr) throw proErr;

      const ids = (pros || []).map((p) => p.user_id);
      if (!ids.length) return [];

      const { data: profiles, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, full_name, role, status")
        .in("user_id", ids)
        .eq("role", "professional");
      if (profileErr) throw profileErr;

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return (pros || [])
        .map((pro) => {
          const profile = profileMap.get(pro.user_id);
          if (!profile) return null;
          return {
            id: pro.user_id,
            name: profile.full_name || profile.display_name || "Healthcare Professional",
            specialty: pro.specialty || "General Practice",
            rating: 4.8,
            available: pro.verification_status === "verified" && profile.status !== "disabled",
          };
        })
        .filter(Boolean) as Array<{ id: string; name: string; specialty: string; rating: number; available: boolean }>;
    },
  });

  const doctors = useMemo(() => professionalProfiles, [professionalProfiles]);

  const {
    connectionState,
    localStream,
    remoteStream,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useWebRTC({
    roomId,
    userId: user?.id || "",
    onConnectionStateChange: (s) => {
      if (s === "connected") setState("active");
      if (s === "failed" || s === "disconnected") setState("ended");
    },
  });

  const handleStartConsultation = useCallback(async () => {
    if (!user || !selectedDoctor || isStartingConsultation) return;
    setIsStartingConsultation(true);
    setState("waiting");

    const { data: encounter, error: encounterError } = await supabase
      .from("encounters")
      .insert({
        patient_id: user.id,
        professional_id: selectedDoctor,
        encounter_type: "telemedicine",
        status: "pending",
      })
      .select("id")
      .single();

    if (encounterError || !encounter) {
      console.error("Failed to create encounter:", encounterError);
      toast({ title: "Unable to start consultation", description: "Please try again.", variant: "destructive" });
      setState("lobby");
      setIsStartingConsultation(false);
      return;
    }

    setEncounterId(encounter.id);

    const { data: room, error: roomError } = await supabase
      .from("consultation_rooms")
      .insert({
        encounter_id: encounter.id,
        created_by: user.id,
        doctor_id: selectedDoctor,
        consent_recording: consentRecording,
        status: "waiting",
      })
      .select("id")
      .single();

    if (roomError || !room) {
      console.error("Failed to create room:", roomError);
      await supabase.from("encounters").delete().eq("id", encounter.id);
      toast({ title: "Unable to start consultation", description: "Could not create call room.", variant: "destructive" });
      setState("lobby");
      setIsStartingConsultation(false);
      return;
    }

    setRoomId(room.id);

    await startCall(videoEnabled, audioEnabled, room.id);
    setIsStartingConsultation(false);
  }, [user, selectedDoctor, consentRecording, videoEnabled, audioEnabled, startCall, isStartingConsultation]);

  const handleCancelWaiting = useCallback(async () => {
    await endCall();
    if (encounterId) {
      await supabase
        .from("encounters")
        .update({ status: "cancelled", ended_at: new Date().toISOString() })
        .eq("id", encounterId);
    }
    setState("lobby");
    setEncounterId(null);
    setRoomId(null);
  }, [endCall, encounterId]);

  const handleEndCall = useCallback(async () => {
    await endCall();
    if (encounterId) {
      await supabase
        .from("encounters")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", encounterId);
    }
    setState("ended");
  }, [endCall, encounterId]);

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

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Video className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Sign in for Telemedicine</h1>
        <p className="text-muted-foreground mb-6">Access virtual consultations with healthcare professionals</p>
        <Button onClick={() => navigate("/auth/sign-in")}>Sign In</Button>
      </div>
    );
  }

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);

  // Active call view
  if (state === "active") {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col">
        <VideoDisplay
          localStream={localStream}
          remoteStream={remoteStream}
          videoEnabled={videoEnabled}
          connectionState={connectionState}
          doctorName={selectedDoctorData?.name || "Doctor"}
          consentRecording={consentRecording}
        />
        <CallControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
          onOpenChat={() => navigate("/patient/ai-assistant")}
          onOpenNotes={() => navigate("/patient/reports")}
        />
      </div>
    );
  }

  // Waiting view
  if (state === "waiting") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold">Connecting to Doctor</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Waiting for {selectedDoctorData?.name} to join...
          </p>
          <Button variant="outline" onClick={handleCancelWaiting}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Ended view
  if (state === "ended") {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Phone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold">Consultation Ended</h2>
          <p className="text-muted-foreground text-sm">
            {consentRecording
              ? "A recording and AI-generated report will be available in your Reports shortly."
              : "No recording was made."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setState("lobby"); setSelectedDoctor(null); setRoomId(null); setEncounterId(null); }}>
              Back to Lobby
            </Button>
            <Button onClick={() => navigate("/patient/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby view
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Telemedicine</h1>
          <p className="text-muted-foreground">Connect with healthcare professionals via live video consultation</p>
        </div>

        {/* Available Doctors */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Available Doctors</h2>
          {providersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading available professionals...
            </div>
          ) : doctors.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  selected={selectedDoctor === doc.id}
                  onSelect={() => doc.available && setSelectedDoctor(doc.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No professionals are available right now. Please check back shortly.</p>
          )}
        </div>

        {selectedDoctor && (
          <>
            <PreConsultationSettings
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
              consentRecording={consentRecording}
              onVideoChange={setVideoEnabled}
              onAudioChange={setAudioEnabled}
              onConsentChange={setConsentRecording}
            />

            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-semibold"
              onClick={handleStartConsultation}
              disabled={isStartingConsultation}
            >
              {isStartingConsultation ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Video className="w-5 h-5 mr-2" />}
              {isStartingConsultation ? "Starting..." : "Start Live Consultation"}
            </Button>
          </>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl p-4 shadow-food-card text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Live Video</p>
            <p className="text-xs text-muted-foreground">Real-time WebRTC calls</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">End-to-End Encrypted</p>
            <p className="text-xs text-muted-foreground">Peer-to-peer connection</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card text-center">
            <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">AI Documentation</p>
            <p className="text-xs text-muted-foreground">Auto-generated reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}
