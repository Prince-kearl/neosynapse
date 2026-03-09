import { useNavigate } from "react-router-dom";
import { 
  Bot, Stethoscope, CalendarCheck, Video, FileText, 
  Hospital, ChevronRight, Activity, Shield, AlertCircle, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import {
  useUpcomingAppointments,
  useRecentReports,
  useRecentTriage,
  usePatientProfile,
} from "@/shared/hooks/useHealthcare";
import heroHealthAssistant from "@/assets/hero-health-assistant.jpg";

const quickActions = [
  { title: "AI Assistant", description: "Get health guidance", icon: Bot, url: "/patient/ai-assistant", color: "bg-primary/10 text-primary" },
  { title: "Symptom Check", description: "Assess your symptoms", icon: Stethoscope, url: "/patient/symptom-checker", color: "bg-accent/10 text-accent" },
  { title: "Telemedicine", description: "Video consultation", icon: Video, url: "/patient/telemedicine", color: "bg-secondary/30 text-secondary-foreground" },
  { title: "My Reports", description: "View medical records", icon: FileText, url: "/patient/reports", color: "bg-muted text-muted-foreground" },
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split("@")[0] || "there";

  const { data: appointments = [], isLoading: appointmentsLoading } = useUpcomingAppointments(3);
  const { data: reports = [] } = useRecentReports(2);
  const { data: triageSessions = [] } = useRecentTriage(1);
  const { data: patientProfile } = usePatientProfile();

  const calculateProfileCompletion = () => {
    if (!patientProfile) return 20;
    let score = 20;
    if (patientProfile.date_of_birth) score += 15;
    if (patientProfile.gender) score += 10;
    if (patientProfile.phone) score += 15;
    if (patientProfile.emergency_contact_name) score += 15;
    if (patientProfile.emergency_contact_phone) score += 10;
    if (patientProfile.insurance_info) score += 15;
    return Math.min(score, 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const latestTriage = triageSessions[0] as any;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-7xl space-y-6 lg:space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Hello, {displayName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">How are you feeling today?</p>
        </div>

        {/* Urgent Triage Alert */}
        {latestTriage && (latestTriage.urgency_level === "urgent" || latestTriage.urgency_level === "emergency") && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-destructive">Recent Symptom Check: {latestTriage.urgency_level?.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on your recent symptom assessment, we recommend consulting a healthcare professional.
              </p>
              <Button size="sm" className="mt-2" onClick={() => navigate("/patient/telemedicine")}>
                Book Consultation
              </Button>
            </div>
          </div>
        )}

        {/* AI Assistant Hero Card */}
        <div 
          className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/20 to-accent/20 border border-border cursor-pointer group"
          onClick={() => navigate("/patient/ai-assistant")}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50 z-10" />
          <img 
            src={heroHealthAssistant} 
            alt="AI Health Assistant" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="relative z-20 p-6 lg:p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-display text-xl lg:text-2xl font-bold">AI Health Assistant</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Get instant health guidance, symptom analysis, and personalized recommendations
                </p>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                  Start Conversation
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Health Profile Completion */}
        <div className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Complete Your Health Profile</h3>
                <p className="text-sm text-muted-foreground">Better recommendations with more info</p>
              </div>
            </div>
            <span className="text-primary font-semibold">{profileCompletion}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
          </div>
          {profileCompletion < 100 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/patient/profile")}>
              Complete Profile
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg lg:text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.url)}
                className="bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Upcoming Appointments Summary */}
        <section className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Upcoming Appointments</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/patient/appointments")}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{apt.appointment_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {apt.scheduled_at 
                          ? new Date(apt.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "Time TBD"
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{apt.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming appointments</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/patient/telemedicine")}>
                Book Consultation
              </Button>
            </div>
          )}
        </section>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <section className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Recent Reports</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/patient/reports")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {reports.map((report: any) => {
                const reportData = report.report_json as Record<string, unknown> | null;
                const title = (reportData?.title as string) || `${report.report_type} Report`;
                return (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/patient/reports")}>View</Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* AI Safety Messaging */}
        <div className="bg-muted/50 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">AI-Powered Health Guidance</p>
            <p className="text-xs text-muted-foreground mt-1">
              Neo Synapse provides AI-assisted health information for guidance only. 
              For medical emergencies, please call emergency services or visit the nearest hospital.
              Always consult a healthcare professional for medical advice.
            </p>
          </div>
        </div>

        {/* Nearby Facilities */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Nearby Facilities</h2>
            <Button variant="ghost" size="sm">
              View Map
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Hospital className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Enable Location</p>
                <p className="text-sm text-muted-foreground">Find hospitals and clinics near you</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
