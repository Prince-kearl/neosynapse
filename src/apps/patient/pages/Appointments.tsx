import { Calendar, Clock, CheckCircle, Loader2, Video, Building2, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyAppointments } from "@/shared/hooks/useHealthcare";
import type { Appointment } from "@/shared/types/healthcare";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
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

const appointmentActionButtonClass =
  "h-10 w-full justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-border sm:bg-transparent";

export default function PatientAppointments() {
  const { isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useMyAppointments();

  const upcomingAppointments = appointments.filter((a: any) => 
    ["pending", "confirmed"].includes(a.status)
  );
  const pastAppointments = appointments.filter((a: any) => 
    ["completed", "cancelled", "in_progress"].includes(a.status)
  );

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const isTelemedicine = appointment.appointment_type === "telemedicine";
    const isUpcoming = appointment.status === "pending" || appointment.status === "confirmed";
    
    return (
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
              isTelemedicine ? "bg-primary/10" : "bg-secondary"
            }`}>
              {isTelemedicine ? (
                <Video className="w-5 h-5 text-primary" />
              ) : (
                <Building2 className="w-5 h-5 text-secondary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium capitalize">{appointment.appointment_type.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.scheduled_at 
                  ? new Date(appointment.scheduled_at).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Time to be confirmed"
                }
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center sm:justify-end">
            {appointment.priority && (
              <Badge className={`w-fit rounded-full px-3 py-1 text-xs ${priorityColors[appointment.priority] || priorityColors.routine}`}>
                {priorityLabels[appointment.priority] || appointment.priority}
              </Badge>
            )}
            <Badge className={`w-fit rounded-full px-3 py-1 text-xs ${statusColors[appointment.status] || statusColors.pending}`}>
              {statusLabels[appointment.status] || appointment.status}
            </Badge>
          </div>
        </div>
        
        {appointment.reason_for_visit && (
          <p className="text-sm text-muted-foreground">
            {appointment.reason_for_visit}
          </p>
        )}

        {isUpcoming && isTelemedicine && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:border-t-0 sm:pt-2">
            <Button size="sm" className={appointmentActionButtonClass} onClick={() => navigate("/patient/telemedicine")}>
              <Video className="w-4 h-4" />
              Join Call
            </Button>
            <Button size="sm" variant="outline" className={appointmentActionButtonClass}>Reschedule</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
              My Appointments
            </h1>
            <p className="text-muted-foreground">
              Track and manage your medical appointments
            </p>
          </div>
          <Button onClick={() => navigate("/patient/appointments/book")} className="w-full gap-2 sm:w-auto">
            <Plus className="w-4 h-4" />
            Book New
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="mb-6">
          <TabsList className="bg-muted w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="flex-1 sm:flex-none gap-2">
              <Clock className="w-4 h-4" />
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 sm:flex-none gap-2">
              <CheckCircle className="w-4 h-4" />
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <EmptyStateCard
                icon={Calendar}
                title="No Upcoming Appointments"
                description="Book a consultation with a healthcare professional."
                actionLabel="Book Consultation"
                onAction={() => navigate("/patient/appointments/book")}
                iconContainerClassName="bg-accent/10"
              />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pastAppointments.length > 0 ? (
              <div className="space-y-4">
                {pastAppointments.map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <EmptyStateCard
                icon={CheckCircle}
                title="No Past Appointments"
                description="Your appointment history will appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
