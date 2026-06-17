import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { appointmentService } from "@/shared/services/healthcare";
import { useMyProfile, usePatientProfile } from "@/shared/hooks/useHealthcare";
import type { AppointmentPriority } from "@/shared/types/healthcare";
import { toast } from "@/hooks/use-toast";
import { DoctorSelect } from "@/apps/patient/components/DoctorSelect";
import { TimeSlotPicker } from "@/apps/patient/components/TimeSlotPicker";
import { AppointmentBookingForm } from "@/apps/patient/components/AppointmentBookingForm";

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

const formatDateSlotKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export default function AppointmentBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const nextDate = new Date();
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  });
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [consultationType, setConsultationType] = useState<"in_person" | "telemedicine">("telemedicine");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<AppointmentPriority>("routine");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isBooking, setIsBooking] = useState(false);

  const { data: profile } = useMyProfile();
  const { data: patientProfile } = usePatientProfile();

  useEffect(() => {
    if (!fullName) {
      setFullName(profile?.full_name || profile?.display_name || user?.email?.split("@")[0] || "");
    }

    if (!email && user?.email) {
      setEmail(user.email);
    }

    if (!phone && patientProfile?.phone) {
      setPhone(patientProfile.phone);
    }
  }, [profile, patientProfile, user, fullName, email, phone]);

  const {
    data: professionalProfiles = [],
    isLoading: providersLoading,
    error: providersError,
  } = useQuery({
    queryKey: ["booking-professionals"],
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

  const doctors = useMemo(() => professionalProfiles, [professionalProfiles]);

  const specialties = useMemo(() => {
    return Array.from(new Set(doctors.map((doctor) => doctor.specialty))).sort();
  }, [doctors]);

  useEffect(() => {
    if (!selectedSpecialty && specialties.length > 0) {
      setSelectedSpecialty(specialties[0]);
    }
  }, [specialties, selectedSpecialty]);

  useEffect(() => {
    if (!selectedDoctor) return;
    const doctor = doctors.find((doc) => doc.id === selectedDoctor);
    if (doctor && doctor.specialty !== selectedSpecialty) {
      setSelectedSpecialty(doctor.specialty);
    }
  }, [selectedDoctor, doctors, selectedSpecialty]);

  const filteredDoctors = useMemo(
    () => (selectedSpecialty ? doctors.filter((doctor) => doctor.specialty === selectedSpecialty) : doctors),
    [doctors, selectedSpecialty],
  );

  useEffect(() => {
    if (selectedDoctor && filteredDoctors.every((doctor) => doctor.id !== selectedDoctor)) {
      setSelectedDoctor(null);
    }
  }, [filteredDoctors, selectedDoctor]);

  const selectedDoctorData = doctors.find((doctor) => doctor.id === selectedDoctor);

  const today = useMemo(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  }, []);

  const maxScheduleDate = useMemo(() => {
    const next = new Date(today);
    next.setDate(next.getDate() + SCHEDULE_LOOKAHEAD_DAYS);
    return next;
  }, [today]);

  const {
    data: doctorSchedule = [],
    isLoading: doctorScheduleLoading,
  } = useQuery<Array<{ id: string; scheduled_at: string | null; status: string }>>({
    queryKey: ["booking-doctor-schedule", selectedDoctor, scheduledDate?.toISOString()],
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
        .map((appointment) => {
          if (!appointment.scheduled_at) return "";
          return formatDateSlotKey(new Date(appointment.scheduled_at));
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

  const selectedSlotUnavailable = selectedScheduleSlotKey ? unavailableSlotKeys.has(selectedScheduleSlotKey) : false;

  const isHighRiskReason = useMemo(() => {
    const normalized = reasonForVisit.trim().toLowerCase();
    if (!normalized) return false;
    return HIGH_RISK_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }, [reasonForVisit]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const getValidationErrors = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!selectedSpecialty) {
      errors.selectedSpecialty = "Select a specialty.";
    }

    if (!selectedDoctor) {
      errors.selectedDoctor = "Choose a doctor.";
    }

    if (!scheduledDate) {
      errors.scheduledDate = "Pick an appointment date.";
    } else if (scheduledDate < today) {
      errors.scheduledDate = "Appointment date cannot be in the past.";
    }

    if (!scheduledTime) {
      errors.scheduledTime = "Choose an appointment time.";
    } else if (scheduledDate) {
      const selectedDateTime = new Date(scheduledDate);
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      if (selectedDateTime < new Date()) {
        errors.scheduledTime = "Please select a future time.";
      }
    }

    if (!consultationType) {
      errors.consultationType = "Choose a consultation type.";
    }

    if (!reasonForVisit.trim()) {
      errors.reasonForVisit = "Describe the reason for your visit.";
    }

    if (!fullName.trim()) {
      errors.fullName = "Enter your full name.";
    }

    if (!email.trim()) {
      errors.email = "Enter your email address.";
    } else if (!validateEmail(email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!phone.trim()) {
      errors.phone = "Enter your phone number.";
    }

    if (selectedSlotUnavailable) {
      errors.scheduledTime = "This time slot is already booked. Please choose another.";
    }

    if (selectedDoctorData && !selectedDoctorData.available) {
      errors.selectedDoctor = "This doctor is currently unavailable. Choose another doctor.";
    }

    return errors;
  }, [selectedSpecialty, selectedDoctor, scheduledDate, scheduledTime, consultationType, reasonForVisit, fullName, email, phone, selectedSlotUnavailable, selectedDoctorData, today]);

  const handleConfirmBooking = useCallback(async () => {
    if (!user || isBooking) return;
    const validation = getValidationErrors();
    setFormErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setIsBooking(true);

    const scheduledAt = new Date(scheduledDate!);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const { data, error } = await appointmentService.create({
      patient_id: user.id,
      professional_id: selectedDoctor!,
      appointment_type: consultationType,
      reason_for_visit: reasonForVisit.trim(),
      scheduled_at: scheduledAt.toISOString(),
      priority: selectedPriority,
      status: "pending",
    }).select("id").single();

    if (error || !data) {
      console.error("Unable to schedule appointment:", error);
      toast({
        title: "Booking failed",
        description: "We could not schedule your appointment right now. Please try again.",
        variant: "destructive",
      });
      setIsBooking(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["my-appointments"] });

    if (["urgent", "emergency"].includes(selectedPriority) || isHighRiskReason) {
      try {
        const pushService = await import("@/shared/services/pushNotificationService").then((m) => m.pushNotificationService);
        await pushService.sendTestPush({
          targetUserId: selectedDoctor!,
          title: selectedPriority === "emergency" ? "Emergency appointment requested" : "Urgent appointment requested",
          body: `${user.email || "A patient"} requested a ${selectedPriority} ${consultationType === "telemedicine" ? "telemedicine" : "in-person"} appointment.`,
          urgency: "high",
          category: "appointment_alert",
          data: {
            appointmentId: data.id,
            patientId: user.id,
            priority: selectedPriority,
            reason: reasonForVisit.trim(),
          },
        });
      } catch (notificationError) {
        console.error("Failed to send priority appointment alert:", notificationError);
      }
    }

    toast({
      title: "Appointment booked",
      description: "Your appointment request was submitted successfully.",
      variant: "success",
    });
    navigate("/patient/appointments");
  }, [user, isBooking, getValidationErrors, selectedDoctor, scheduledDate, scheduledTime, consultationType, reasonForVisit, selectedPriority, isHighRiskReason, navigate, queryClient]);

  const availableSlotSummary = scheduledDate
    ? `${scheduledDate.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })} at ${scheduledTime}`
    : "Choose a date and time.";

  const bookingSummary = selectedDoctorData
    ? [
        { label: "Doctor", value: selectedDoctorData.name },
        { label: "Specialty", value: selectedDoctorData.specialty },
        { label: "Type", value: consultationType === "telemedicine" ? "Telemedicine" : "In-person" },
        { label: "Date & time", value: availableSlotSummary },
      ]
    : [];

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patient/appointments")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold">Book an Appointment</h1>
            <p className="text-muted-foreground text-sm">Fill out the appointment request form and confirm your booking.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <DoctorSelect
            doctors={doctors}
            specialties={specialties}
            selectedSpecialty={selectedSpecialty}
            selectedDoctor={selectedDoctor}
            isLoading={providersLoading}
            error={providersError}
            onSpecialtyChange={(value) => setSelectedSpecialty(value)}
            onDoctorChange={(value) => setSelectedDoctor(value)}
          />

          {selectedDoctor && (
            <TimeSlotPicker
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              onDateChange={setScheduledDate}
              onTimeChange={setScheduledTime}
              unavailableSlotKeys={unavailableSlotKeys}
              minDate={today}
              maxDate={maxScheduleDate}
              isLoading={doctorScheduleLoading}
              dateError={formErrors.scheduledDate}
              timeError={formErrors.scheduledTime}
            />
          )}

          {selectedDoctor && (
            <div className="bg-muted/50 rounded-2xl border border-border p-5">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Booking summary</p>
              <div className="space-y-3 text-sm">
                {bookingSummary.map((item) => (
                  <div key={item.label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDoctor && selectedDoctorData && (
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold">Appointment priority</h2>
              <div className="grid gap-3">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedPriority(option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${selectedPriority === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/20"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-sm">{option.label}</span>
                      <span className="text-xs text-muted-foreground capitalize">{option.value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </button>
                ))}
              </div>

              {isHighRiskReason && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-medium">High-risk symptoms detected</p>
                    <p className="text-sm text-amber-800/80">Consider selecting Priority or Emergency for faster review.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedDoctor && (
            <AppointmentBookingForm
              consultationType={consultationType}
              onConsultationTypeChange={setConsultationType}
              reasonForVisit={reasonForVisit}
              onReasonChange={setReasonForVisit}
              fullName={fullName}
              onFullNameChange={setFullName}
              email={email}
              onEmailChange={setEmail}
              phone={phone}
              onPhoneChange={setPhone}
              formErrors={formErrors}
              isSubmitting={isBooking}
              onCancel={() => navigate("/patient/appointments")}
              onSubmit={handleConfirmBooking}
            />
          )}
        </div>
      </div>
    </div>
  );
}
