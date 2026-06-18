import { useCallback, useMemo } from "react";
import { CalendarCheck, Clock, Loader2, CheckCircle2, XCircle, Video } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { toast } from "@/hooks/use-toast";
import { appointmentService } from "@/shared/services/healthcare";
import { useProfessionalAppointments, useProfileNames } from "@/shared/hooks/useHealthcare";
import type { Appointment } from "@/shared/types/healthcare";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const priorityColors: Record<string, string> = {
  routine: "bg-slate-100 text-slate-700 border-slate-200",
  priority: "bg-blue-100 text-blue-700 border-blue-200",
  urgent: "bg-amber-100 text-amber-800 border-amber-200",
  emergency: "bg-red-100 text-red-700 border-red-200",
};

const priorityLabels: Record<string, string> = {
  routine: "Routine",
  priority: "Priority",
  urgent: "Urgent",
  emergency: "Emergency",
};

const getSlotKey = (scheduledAt: string | null) => {
  if (!scheduledAt) return null;
  return new Date(scheduledAt).toISOString();
};

const canConfirmAppointment = (appointment: Appointment, appointments: Appointment[]) => {
  const slotKey = getSlotKey(appointment.scheduled_at);
  if (!slotKey) return true;
  return !appointments.some((other) =>
    other.id !== appointment.id &&
    other.status !== "cancelled" &&
    getSlotKey(other.scheduled_at) === slotKey,
  );
};

const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []);

const appointmentActionButtonClass =
  "h-10 w-full justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-border sm:bg-transparent";

const renderSnapshotList = (label: string, values: string[], variant: "secondary" | "destructive" = "secondary") => {
  if (values.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={`${label}-${value}`} variant={variant}>
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default function ProfessionalAppointments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: appointments = [], isLoading } = useProfessionalAppointments();
  const patientIds = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.patient_id).filter(Boolean))],
    [appointments],
  );
  const { data: patientNames = {} } = useProfileNames(patientIds);

  const pendingAppointments = appointments.filter((appointment) => appointment.status === "pending");
  const upcomingAppointments = appointments.filter((appointment) => ["confirmed", "in_progress"].includes(appointment.status));
  const pastAppointments = appointments.filter((appointment) => ["completed", "cancelled"].includes(appointment.status));
  const defaultTab = searchParams.get("tab") === "upcoming" ? "upcoming" : searchParams.get("tab") === "past" ? "past" : "pending";

  const handleChangeStatus = useCallback(
    async (appointment: Appointment, nextStatus: "confirmed" | "cancelled") => {
      if (!canConfirmAppointment(appointment, appointments) && nextStatus === "confirmed") {
        toast({
          title: "Schedule conflict",
          description: "A different appointment already occupies this slot. Please resolve that before confirming.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await appointmentService.updateStatus(appointment.id, nextStatus);
      if (error) {
        console.error("Failed to update appointment status:", error);
        toast({ title: "Unable to update", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: nextStatus === "confirmed" ? "Appointment confirmed" : "Appointment declined",
        description:
          nextStatus === "confirmed"
            ? "The appointment has been confirmed and the patient will be notified."
            : "The appointment request has been declined.",
        variant: nextStatus === "confirmed" ? "success" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["pro-appointments"] });
    },
    [appointments, queryClient],
  );

  const renderAppointmentCard = (appointment: Appointment) => {
    const slotKey = getSlotKey(appointment.scheduled_at);
    const hasConflict = !canConfirmAppointment(appointment, appointments);
    const patientName = patientNames[appointment.patient_id] || "Patient";
    const snapshot = (appointment.medical_history_snapshot || {}) as Record<string, unknown>;
    const conditions = asStringArray(snapshot.existing_conditions);
    const allergies = asStringArray(snapshot.allergies);
    const medications = asStringArray(snapshot.current_medications);
    const surgeries = asStringArray(snapshot.past_surgeries);
    const uploadedDocuments = Array.isArray(snapshot.uploaded_documents)
      ? snapshot.uploaded_documents.filter((document): document is Record<string, unknown> => typeof document === "object" && document !== null)
      : [];
    const hasSnapshot =
      conditions.length > 0 ||
      allergies.length > 0 ||
      medications.length > 0 ||
      surgeries.length > 0 ||
      typeof snapshot.family_medical_history === "string" ||
      typeof snapshot.notes === "string" ||
      uploadedDocuments.length > 0;

    return (
      <div key={appointment.id} className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-lg truncate">{patientName}</p>
            <p className="text-sm text-muted-foreground">
              {appointment.appointment_type.replace("_", " ")} • {appointment.reason_for_visit || "No reason provided"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge className={`w-fit rounded-full px-3 py-1 text-xs ${priorityColors[appointment.priority || "routine"]}`}>
              {priorityLabels[appointment.priority || "routine"]}
            </Badge>
            <Badge className={`w-fit rounded-full px-3 py-1 text-xs ${statusColors[appointment.status] || statusColors.pending}`}>
              {statusLabels[appointment.status] || appointment.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled</p>
            <p className="text-sm text-foreground">
              {appointment.scheduled_at
                ? new Date(appointment.scheduled_at).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "To be assigned"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
            <p className="text-sm text-foreground">{patientName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested</p>
            <p className="text-sm text-foreground">
              {new Date(appointment.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {hasConflict && (
          <div className="rounded-2xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            Another appointment already occupies this slot. Confirming is blocked until the conflict is resolved.
          </div>
        )}

        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Medical history sent with request</p>
            <p className="text-xs text-muted-foreground">
              Snapshot captured when the patient booked this appointment.
            </p>
          </div>
          {hasSnapshot ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {renderSnapshotList("Conditions", conditions)}
              {renderSnapshotList("Allergies", allergies, "destructive")}
              {renderSnapshotList("Medications", medications)}
              {renderSnapshotList("Past surgeries", surgeries)}
              {typeof snapshot.family_medical_history === "string" && snapshot.family_medical_history.trim() && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Family history</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{snapshot.family_medical_history}</p>
                </div>
              )}
              {typeof snapshot.notes === "string" && snapshot.notes.trim() && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Additional notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{snapshot.notes}</p>
                </div>
              )}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents on file</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedDocuments.map((document, index) => (
                      <Badge key={`${document.file_name || "document"}-${index}`} variant="outline">
                        {typeof document.file_name === "string" ? document.file_name : "Medical document"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved medical history was available when this appointment was booked.
            </p>
          )}
        </div>

        {appointment.status === "pending" && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:items-center sm:justify-end sm:border-t-0 sm:pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleChangeStatus(appointment, "cancelled")}
              className={`${appointmentActionButtonClass} text-destructive hover:text-destructive`}
            >
              <XCircle className="w-4 h-4" />
              Decline
            </Button>
            <Button
              size="sm"
              className={appointmentActionButtonClass}
              onClick={() => handleChangeStatus(appointment, "confirmed")}
              disabled={hasConflict}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm
            </Button>
          </div>
        )}

        {appointment.status === "confirmed" && appointment.appointment_type === "telemedicine" && (
          <div className="border-t border-border pt-3 sm:flex sm:justify-end sm:border-t-0 sm:pt-0">
            <Button
              size="sm"
              className={appointmentActionButtonClass}
              onClick={() => navigate(`/professional/telemedicine?appointmentId=${appointment.id}&action=start`)}
            >
              <Video className="w-4 h-4" />
              Start Call
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Appointment Requests</h1>
          <p className="text-muted-foreground">Review scheduled consultation requests and confirm patient bookings.</p>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <CalendarCheck className="w-4 h-4" />
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              History ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingAppointments.length > 0 ? (
              pendingAppointments.map(renderAppointmentCard)
            ) : (
              <EmptyStateCard
                icon={CalendarCheck}
                title="No pending appointments"
                description="There are no appointment requests waiting for your review."
                compact
              />
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))
            ) : (
              <EmptyStateCard
                icon={CalendarCheck}
                title="No upcoming appointments"
                description="Confirmed appointments will appear here when they are scheduled."
                compact
              />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : pastAppointments.length > 0 ? (
              pastAppointments.map((appointment) => renderAppointmentCard(appointment))
            ) : (
              <EmptyStateCard
                icon={CheckCircle2}
                title="No appointment history"
                description="Past completed or cancelled appointments will appear here."
                compact
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
