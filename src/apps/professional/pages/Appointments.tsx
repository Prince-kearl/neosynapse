import { useCallback, useMemo } from "react";
import { CalendarCheck, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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

export default function ProfessionalAppointments() {
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

    return (
      <div key={appointment.id} className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-lg truncate">{patientName}</p>
            <p className="text-sm text-muted-foreground">
              {appointment.appointment_type.replace("_", " ")} • {appointment.reason_for_visit || "No reason provided"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={priorityColors[appointment.priority || "routine"]}>
              {priorityLabels[appointment.priority || "routine"]}
            </Badge>
            <Badge className={statusColors[appointment.status] || statusColors.pending}>
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

        {appointment.status === "pending" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleChangeStatus(appointment, "cancelled")}
              className="w-full sm:w-auto"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => handleChangeStatus(appointment, "confirmed")}
              disabled={hasConflict}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm
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

        <Tabs defaultValue="pending">
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
