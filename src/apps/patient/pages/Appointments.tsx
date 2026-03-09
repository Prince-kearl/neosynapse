import { Calendar, Clock, CheckCircle, Loader2, Video, Building2, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/shared/types/healthcare";

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

export default function PatientAppointments() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["patient-appointments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user,
  });

  const upcomingAppointments = appointments.filter(a => 
    ["pending", "confirmed"].includes(a.status)
  );
  const pastAppointments = appointments.filter(a => 
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
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isTelemedicine ? "bg-primary/10" : "bg-secondary"
            }`}>
              {isTelemedicine ? (
                <Video className="w-5 h-5 text-primary" />
              ) : (
                <Building2 className="w-5 h-5 text-secondary-foreground" />
              )}
            </div>
            <div>
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
          <Badge className={statusColors[appointment.status] || statusColors.pending}>
            {statusLabels[appointment.status] || appointment.status}
          </Badge>
        </div>
        
        {appointment.reason_for_visit && (
          <p className="text-sm text-muted-foreground">
            {appointment.reason_for_visit}
          </p>
        )}

        {isUpcoming && isTelemedicine && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1" onClick={() => navigate("/patient/telemedicine")}>
              <Video className="w-4 h-4 mr-1" />
              Join Call
            </Button>
            <Button size="sm" variant="outline">Reschedule</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
              My Appointments
            </h1>
            <p className="text-muted-foreground">
              Track and manage your medical appointments
            </p>
          </div>
          <Button onClick={() => navigate("/patient/telemedicine")} className="gap-2">
            <Plus className="w-4 h-4" />
            Book New
          </Button>
        </div>

        {/* Tabs */}
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
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  No Upcoming Appointments
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Book a consultation with a healthcare professional.
                </p>
                <Button onClick={() => navigate("/patient/telemedicine")} variant="outline">
                  Book Consultation
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pastAppointments.length > 0 ? (
              <div className="space-y-4">
                {pastAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  No Past Appointments
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your appointment history will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
