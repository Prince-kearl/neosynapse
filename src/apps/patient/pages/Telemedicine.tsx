// Patient Telemedicine - uses existing WebRTC infrastructure
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, Phone, Clock, Shield, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoDisplay } from "@/components/telemedicine/VideoDisplay";
import { CallControls } from "@/components/telemedicine/CallControls";
import { DoctorCard } from "@/components/telemedicine/DoctorCard";
import { PreConsultationSettings } from "@/components/telemedicine/PreConsultationSettings";
import { appointmentService } from "@/shared/services/healthcare";
import { pushNotificationService } from "@/shared/services/pushNotificationService";
import type { AppointmentPriority } from "@/shared/types/healthcare";
import { toast } from "@/hooks/use-toast";

type ConsultationState = "lobby" | "waiting" | "active" | "ended";

type ContactItem = {
  name: string;
  phone: string;
  phoneLabel?: string;
  email?: string;
  note?: string;
};

const emergencyContacts: ContactItem[] = [
  { name: "Emergency (All Services)", phone: "112", note: "Ambulance, Police, Fire" },
  { name: "Ambulance Service", phone: "193" },
  { name: "Police Service", phone: "191" },
  { name: "Fire Service", phone: "192" },
  { name: "COVID-19 Information", phone: "311" },
];

const healthInstitutionContacts: ContactItem[] = [
  { name: "Ghana Health Service (GHS)", phone: "+233302682709", phoneLabel: "+233 30 268 2709", email: "info@ghs.gov.gh" },
  { name: "GHS Information Line", phone: "0303982351", phoneLabel: "030 398 2351" },
  { name: "Ministry of Health (MOH)", phone: "+233302665651", phoneLabel: "+233 302 665651", email: "info@moh.gov.gh" },
  { name: "NHIS Call Center", phone: "0544446447", phoneLabel: "054 444 6447" },
];

const hospitalContacts: ContactItem[] = [
  { name: "Trust/SSNIT Hospital", phone: "+233302761974", phoneLabel: "+233 (0) 302 761 974 / 5" },
  { name: "North Ridge Clinic", phone: "+233302227328", phoneLabel: "+233 (0) 302 227 328" },
  { name: "West African Rescue Association (WARA)", phone: "+233302781258", phoneLabel: "+233 (0) 302 781 258", note: "Emergency support" },
  { name: "Planned Parenthood Association of Ghana (PPAG)", phone: "+233302306104", phoneLabel: "+233 302 306104" },
];

const regionalContacts: ContactItem[] = [
  { name: "Ashanti Region", phone: "0322022323", phoneLabel: "0322022323", note: "Alt: 0322025441, 0322022827" },
  { name: "Brong Ahafo Region", phone: "0352027083", phoneLabel: "0352027083", note: "Alt: 03522027307" },
  { name: "Northern Region", phone: "0372022889", phoneLabel: "0372022889", note: "Alt: 0372022297" },
];

const TIME_SLOTS = ["09:00", "11:00", "14:00", "16:00"];
const SCHEDULE_LOOKAHEAD_DAYS = 30;

const PRIORITY_OPTIONS = [
  { value: "routine" as const, label: "Routine", description: "Regular consultation with no immediate urgency." },
  { value: "priority" as const, label: "Priority", description: "Needs attention soon but not immediate." },
  { value: "urgent" as const, label: "Urgent", description: "Requesting prompt review from your doctor." },
  { value: "emergency" as const, label: "Emergency", description: "Immediate attention required. Doctor alerted." },
];

const HIGH_RISK_KEYWORDS = [
  "chest pain",
  "shortness of breath",
  "severe pain",
  "bleeding",
  "unconscious",
  "trauma",
  "stroke",
  "heart attack",
  "difficulty breathing",
  "allergic reaction",
  "sudden weakness",
  "confusion",
];

export default function PatientTelemedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ConsultationState>("lobby");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [consentRecording, setConsentRecording] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);
  const [searchParams] = useSearchParams();
  const [bookingMode, setBookingMode] = useState<"live" | "schedule">(
    searchParams.get("mode") === "schedule" ? "schedule" : "live",
  );
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  });
  const [scheduledTime, setScheduledTime] = useState(TIME_SLOTS[0]);
  const [reasonForVisit, setReasonForVisit] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<AppointmentPriority>("routine");
  const [isScheduling, setIsScheduling] = useState(false);
  const consumedJoinLinkRef = useRef<string | null>(null);

  const formatDateSlotKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const {
    data: doctorSchedule = [],
    isLoading: doctorScheduleLoading,
  } = useQuery<Array<{ id: string; scheduled_at: string | null; status: string }>>({
    queryKey: ["doctor-schedule", selectedDoctor, scheduledDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDoctor || !scheduledDate) return [];
      const dayStart = new Date(scheduledDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status")
        .eq("professional_id", selectedDoctor)
        .in("status", ["pending", "confirmed"])
        .gte("scheduled_at", dayStart.toISOString())
        .lt("scheduled_at", dayEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDoctor && !!scheduledDate,
    staleTime: 5 * 60_000,
  });

  const unavailableSlotKeys = useMemo(() => {
    return new Set(
      doctorSchedule
        .map((appt) => {
          if (!appt.scheduled_at) return "";
          return formatDateSlotKey(new Date(appt.scheduled_at));
        })
        .filter(Boolean),
    );
  }, [doctorSchedule]);

  const selectedScheduleSlotKey = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return "";
    const selectedDateTime = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    return formatDateSlotKey(selectedDateTime);
  }, [scheduledDate, scheduledTime]);

  const selectedSlotUnavailable = selectedScheduleSlotKey
    ? unavailableSlotKeys.has(selectedScheduleSlotKey)
    : false;

  const {
    data: professionalProfiles = [],
    isLoading: providersLoading,
    error: providersError,
  } = useQuery({
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
            available: pro.verification_status !== "rejected" && profile.status !== "disabled",
          };
        })
        .filter(Boolean) as Array<{ id: string; name: string; specialty: string; rating: number; available: boolean }>;
    },
  });

  const {
    data: waitingQueue = [],
    isLoading: queueLoading,
    error: queueError,
  } = useQuery({
    queryKey: ["patient-telemedicine-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encounters")
        .select("id, created_at")
        .eq("encounter_type", "telemedicine")
        .eq("status", "pending");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const doctors = useMemo(() => professionalProfiles, [professionalProfiles]);
  const waitingCount = waitingQueue.length;
  const estimatedWaitMinutes = useMemo(() => {
    if (waitingCount === 0) return 0;
    return Math.min(60, waitingCount * 5);
  }, [waitingCount]);

  const isHighRiskReason = useMemo(() => {
    const normalized = reasonForVisit.trim().toLowerCase();
    if (!normalized) return false;
    return HIGH_RISK_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }, [reasonForVisit]);

  const {
    connectionState,
    localStream,
    remoteStream,
    startCall,
    joinCall,
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

  useEffect(() => {
    const targetRoomId = searchParams.get("roomId")?.trim() || null;
    const targetEncounterId = searchParams.get("encounterId")?.trim() || null;
    const action = searchParams.get("action")?.trim() || null;
    if (!user?.id || !targetRoomId || !targetEncounterId || action !== "join") return;
    if (consumedJoinLinkRef.current === `${targetEncounterId}|${targetRoomId}`) return;

    consumedJoinLinkRef.current = `${targetEncounterId}|${targetRoomId}`;

    const joinDoctorStartedCall = async () => {
      setState("waiting");
      setRoomId(targetRoomId);
      setEncounterId(targetEncounterId);

      const { data: encounter, error: encounterError } = await supabase
        .from("encounters")
        .select("id, patient_id, professional_id, status")
        .eq("id", targetEncounterId)
        .eq("patient_id", user.id)
        .single();

      if (encounterError || !encounter) {
        console.error("Unable to open consultation invite:", encounterError);
        toast({ title: "Call not available", description: "This consultation invite could not be opened.", variant: "destructive" });
        setState("lobby");
        return;
      }

      const { data: room, error: roomError } = await supabase
        .from("consultation_rooms")
        .select("id, encounter_id, doctor_id, status, offer")
        .eq("id", targetRoomId)
        .eq("encounter_id", targetEncounterId)
        .single();

      if (roomError || !room?.offer) {
        console.error("Unable to join consultation room:", roomError);
        toast({ title: "Call not ready", description: "The doctor has not started the video room yet.", variant: "destructive" });
        setState("lobby");
        return;
      }

      setSelectedDoctor(encounter.professional_id || room.doctor_id);
      await joinCall(videoEnabled, audioEnabled, targetRoomId);
    };

    void joinDoctorStartedCall();
  }, [audioEnabled, joinCall, searchParams, user?.id, videoEnabled]);

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

    try {
      await pushNotificationService.sendTelemedicineCallNotification({
        professionalId: selectedDoctor,
        encounterId: encounter.id,
        roomId: room.id,
        patientName: user.email || "Patient",
      });
    } catch (notificationError) {
      console.error("Failed to send telemedicine push notification:", notificationError);
    }

    await startCall(videoEnabled, audioEnabled, room.id);
    setIsStartingConsultation(false);
  }, [user, selectedDoctor, consentRecording, videoEnabled, audioEnabled, startCall, isStartingConsultation]);

  const handleScheduleAppointment = useCallback(async () => {
    if (!user || !selectedDoctor || !scheduledDate || !scheduledTime || isScheduling) return;
    setIsScheduling(true);

    const scheduledAt = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    if (selectedSlotUnavailable) {
      toast({
        title: "Booking conflict",
        description: "Selected doctor already has an appointment at that time. Please choose a different slot or doctor.",
        variant: "destructive",
      });
      setIsScheduling(false);
      return;
    }

    const { data, error } = await appointmentService.create({
      patient_id: user.id,
      professional_id: selectedDoctor,
      appointment_type: "telemedicine",
      reason_for_visit: reasonForVisit || null,
      scheduled_at: scheduledAt.toISOString(),
      priority: selectedPriority,
      status: "pending",
    } as any).select("id").single();

    if (error || !data) {
      console.error("Unable to schedule appointment:", error);
      toast({ title: "Booking failed", description: "We could not schedule your consultation. Please try again.", variant: "destructive" });
      setIsScheduling(false);
      return;
    }

    if (["urgent", "emergency"].includes(selectedPriority) || isHighRiskReason) {
      try {
        await pushNotificationService.sendTestPush({
          targetUserId: selectedDoctor,
          title: selectedPriority === "emergency" ? "Emergency appointment requested" : "Urgent appointment requested",
          body: `${user.email || "A patient"} requested a ${selectedPriority} telemedicine appointment. Please review promptly.`,
          urgency: "high",
          category: "telemedicine_appointment_alert",
          data: {
            appointmentId: data.id,
            patientId: user.id,
            priority: selectedPriority,
            reason: reasonForVisit || "No reason provided",
          },
        });
      } catch (notificationError) {
        console.error("Failed to send priority appointment alert:", notificationError);
      }
    }

    toast({ title: "Appointment booked", description: "Your consultation has been scheduled. Check your appointments list for confirmation.", variant: "success" });
    navigate("/patient/appointments");
  }, [user, selectedDoctor, scheduledDate, scheduledTime, reasonForVisit, selectedPriority, isHighRiskReason, isScheduling, navigate]);

  const today = useMemo(() => {
    const current = new Date();
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
    return current;
  }, []);

  const maxScheduleDate = useMemo(() => {
    const next = new Date(today);
    next.setDate(next.getDate() + SCHEDULE_LOOKAHEAD_DAYS);
    return next;
  }, [today]);

  const disabledScheduleDays = useMemo(
    () => [{ before: today }, { after: maxScheduleDate }],
    [today, maxScheduleDate],
  );

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

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);

  const availableSlotSummary = scheduledDate
    ? `${scheduledDate.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })} at ${scheduledTime}`
    : "Choose a date and time.";

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

  // Keep patient UI in sync with room and encounter updates from the professional side.
  useEffect(() => {
    if (!roomId && !encounterId) return;

    const channel = supabase
      .channel(`patient-tele-sync-${user?.id || "anon"}-${roomId || "none"}-${encounterId || "none"}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultation_rooms",
          ...(roomId ? { filter: `id=eq.${roomId}` } : {}),
        },
        (payload) => {
          const next = payload.new as { status?: string };
          if (next?.status === "active") {
            setState("active");
          }
          if (next?.status === "ended" && state !== "ended") {
            setState("ended");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "encounters",
          ...(encounterId ? { filter: `id=eq.${encounterId}` } : {}),
        },
        (payload) => {
          const next = payload.new as { status?: string };
          if (next?.status === "in_progress") {
            setState("active");
          }
          if (["completed", "cancelled"].includes(next?.status || "") && state !== "ended") {
            setState("ended");
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, encounterId, user?.id, state]);

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

  const ContactGroup = ({
    title,
    contacts,
  }: {
    title: string;
    contacts: ContactItem[];
  }) => (
    <section className="bg-card rounded-2xl p-4 sm:p-5 border border-border space-y-3">
      <h3 className="font-display text-base sm:text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={`${title}-${contact.name}`} className="rounded-xl border border-border/60 p-3 bg-background/30">
            <p className="font-medium text-sm sm:text-base">{contact.name}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {contact.phoneLabel || contact.phone}
            </p>
            {contact.note && <p className="text-xs text-muted-foreground mt-1">{contact.note}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="h-8 sm:h-9">
                <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name}`}>
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  Call
                </a>
              </Button>
              {contact.email && (
                <Button asChild size="sm" variant="outline" className="h-8 sm:h-9">
                  <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`}>
                    Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

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
          <p className="text-muted-foreground">Connect with healthcare professionals via live or scheduled video consultation</p>
        </div>

        {/* Queue Visibility */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Queue status</p>
              <p className="text-sm text-muted-foreground">
                {queueLoading
                  ? "Checking current queue..."
                  : queueError
                  ? "Queue unavailable"
                  : waitingCount === 0
                  ? "No patients currently waiting"
                  : `${waitingCount} patient${waitingCount === 1 ? "" : "s"} waiting`}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {queueLoading || queueError ? null : (
                <span>
                  Estimated wait time: <span className="font-semibold">
                    {waitingCount === 0 ? "Less than 5 minutes" : `${estimatedWaitMinutes} minutes`}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Available Doctors */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Available Doctors</h2>
          {providersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading available professionals...
            </div>
          ) : providersError ? (
            <p className="text-sm text-destructive">Unable to load professionals right now. Please try again.</p>
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
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                size="sm"
                variant={bookingMode === "live" ? "default" : "outline"}
                onClick={() => setBookingMode("live")}
              >
                Live consultation
              </Button>
              <Button
                size="sm"
                variant={bookingMode === "schedule" ? "default" : "outline"}
                onClick={() => setBookingMode("schedule")}
              >
                Schedule consultation
              </Button>
            </div>

            {bookingMode === "live" ? (
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
            ) : (
              <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Schedule a future consultation</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a preferred date and time for {selectedDoctorData?.name}.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available next {SCHEDULE_LOOKAHEAD_DAYS} days
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="booking-date">Preferred date</Label>
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(date) => setScheduledDate(date || scheduledDate)}
                        disabled={disabledScheduleDays}
                      />
                    </div>

                    <div>
                      <Label htmlFor="booking-time">Available time slots</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {TIME_SLOTS.map((slot) => {
                          const slotDateTime = new Date(scheduledDate);
                          const [hours, minutes] = slot.split(":").map(Number);
                          slotDateTime.setHours(hours, minutes, 0, 0);
                          const slotKey = formatDateSlotKey(slotDateTime);
                          const slotUnavailable = unavailableSlotKeys.has(slotKey);

                          return (
                            <button
                              key={slot}
                              type="button"
                              className={cn(
                                "rounded-2xl border px-3 py-2 text-sm font-medium text-left transition",
                                slotUnavailable
                                  ? "border-destructive/30 bg-destructive/10 text-destructive opacity-80"
                                  : slot === scheduledTime
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background hover:border-primary/20",
                              )}
                              onClick={() => !slotUnavailable && setScheduledTime(slot)}
                              disabled={slotUnavailable}
                            >
                              {slot}
                              {slotUnavailable ? " • Booked" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="booking-reason">Reason for visit</Label>
                      <Input
                        id="booking-reason"
                        placeholder="e.g. follow-up, chest pain, fever"
                        value={reasonForVisit}
                        onChange={(event) => setReasonForVisit(event.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="booking-priority">Appointment priority</Label>
                      <div className="grid gap-2 mt-2">
                        {PRIORITY_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              "rounded-2xl border px-4 py-3 text-left transition",
                              selectedPriority === option.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:border-primary/20",
                            )}
                            onClick={() => setSelectedPriority(option.value)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-sm">{option.label}</span>
                              <span className="text-xs text-muted-foreground capitalize">{option.value}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {isHighRiskReason && (
                      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                        High-risk symptoms were detected from your reason for visit. Please consider selecting "Urgent" or "Emergency" so the doctor can prioritize your consultation.
                      </div>
                    )}

                    {selectedSlotUnavailable && (
                      <div className="rounded-2xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                        This doctor already has a confirmed or pending appointment at the selected time. Choose another slot or switch to a different doctor.
                      </div>
                    )}

                    <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
                      <p className="font-medium">Selected time</p>
                      <p>{availableSlotSummary}</p>
                    </div>

                    <Button
                      className="w-full h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-semibold"
                      onClick={handleScheduleAppointment}
                      disabled={isScheduling || doctorScheduleLoading || selectedSlotUnavailable}
                    >
                      {isScheduling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                      {isScheduling ? "Booking..." : "Schedule consultation"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-4">
          <div className="bg-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-food-card text-center">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-1.5 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium leading-tight">Live Video</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Real-time WebRTC calls</p>
          </div>
          <div className="bg-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-food-card text-center">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-1.5 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium leading-tight">End-to-End Encrypted</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Peer-to-peer connection</p>
          </div>
          <div className="bg-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-food-card text-center">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-1.5 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium leading-tight">AI Documentation</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Auto-generated reports</p>
          </div>
        </div>

        {/* Emergency & Health Contacts */}
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Emergency & Health Contacts (Ghana)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tap any number below to place an audio call directly from your phone.
            </p>
          </div>

          <ContactGroup title="Emergency Numbers" contacts={emergencyContacts} />
          <ContactGroup title="Health Institution Contacts" contacts={healthInstitutionContacts} />
          <ContactGroup title="Hospital & Specialized Contacts" contacts={hospitalContacts} />
          <ContactGroup title="Regional Health Contacts" contacts={regionalContacts} />
        </div>
      </div>
    </div>
  );
}
