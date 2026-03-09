import { useNavigate } from "react-router-dom";
import { 
  Users, ClipboardList, Video, FileText, PenTool, Clock, 
  AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import {
  useProfessionalEncounters,
  useProfessionalNotes,
  useAssignedPatients,
  useProfileNames,
} from "@/shared/hooks/useHealthcare";

export default function ProfessionalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();

  const displayName = profile?.full_name || profile?.display_name || "Doctor";

  const { data: encounters = [], isLoading: encLoading } = useProfessionalEncounters();
  const { data: notes = [] } = useProfessionalNotes();
  const { data: patients = [] } = useAssignedPatients();

  const activeEncounters = encounters.filter((e: any) => ["pending", "in_progress"].includes(e.status));
  const todayQueue = activeEncounters.slice(0, 3);
  const patientIds = todayQueue.map((e: any) => e.patient_id);
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const draftNoteCount = notes.filter((n: any) => n.status === "draft" || n.status === "review").length;
  const completedEncounters = encounters.filter((e: any) => e.status === "completed").length;

  // Check for high-urgency triage in active encounters
  const hasUrgentAlert = activeEncounters.some((e: any) => e.status === "pending");

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-7xl space-y-6 lg:space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Good morning, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your clinical overview for today</p>
        </div>

        {/* High Priority Alerts */}
        {hasUrgentAlert && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Pending Encounters</p>
                <p className="text-sm text-foreground mt-1">
                  You have {activeEncounters.filter((e: any) => e.status === "pending").length} pending encounter(s) awaiting your attention.
                </p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => navigate("/professional/encounters")}>View</Button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">{patients.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Assigned Patients</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <span className="text-2xl font-bold">{activeEncounters.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Encounters</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-2xl font-bold">{draftNoteCount}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending Notes</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-2xl font-bold">{completedEncounters}</span>
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Today's Queue */}
        <section className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Active Queue</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/professional/encounters")}>
              View All
            </Button>
          </div>
          {encLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : todayQueue.length > 0 ? (
            <div className="space-y-3">
              {todayQueue.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {(nameMap[item.patient_id] || "P").charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{nameMap[item.patient_id] || "Patient"}</p>
                      <p className="text-sm text-muted-foreground">{item.encounter_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(item.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <Badge variant="outline" className={
                      item.status === "pending" ? "border-yellow-500/50 text-yellow-500" : "border-primary/50 text-primary"
                    }>
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active encounters</p>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/professional/telemedicine")}
              className="bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors"
            >
              <Video className="w-8 h-8 text-primary mb-2" />
              <p className="font-medium">Start Consultation</p>
            </button>
            <button
              onClick={() => navigate("/professional/patients")}
              className="bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors"
            >
              <Users className="w-8 h-8 text-accent mb-2" />
              <p className="font-medium">View Patients</p>
            </button>
            <button
              onClick={() => navigate("/professional/notes")}
              className="bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors"
            >
              <PenTool className="w-8 h-8 text-yellow-500 mb-2" />
              <p className="font-medium">Review Notes</p>
            </button>
            <button
              onClick={() => navigate("/professional/transcripts")}
              className="bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors"
            >
              <FileText className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="font-medium">Transcripts</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
