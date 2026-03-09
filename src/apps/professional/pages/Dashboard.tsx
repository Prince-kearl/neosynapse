import { useNavigate } from "react-router-dom";
import { 
  Users, ClipboardList, Video, FileText, PenTool, Clock, 
  AlertTriangle, CheckCircle, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";

export default function ProfessionalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();

  const displayName = profile?.full_name || profile?.display_name || "Doctor";

  // TODO: Fetch real data from encounters, appointments, notes tables
  const mockQueue = [
    { id: "1", patientName: "Ama Mensah", reason: "Follow-up: Hypertension", time: "9:00 AM", status: "waiting" },
    { id: "2", patientName: "Kofi Asante", reason: "New: Chest pain evaluation", time: "9:30 AM", status: "scheduled" },
    { id: "3", patientName: "Efua Owusu", reason: "Follow-up: Diabetes management", time: "10:00 AM", status: "scheduled" },
  ];

  const mockAlerts = [
    { id: "1", type: "triage", message: "High urgency triage: Patient #4521 - Severe chest pain", time: "5 min ago" },
  ];

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
        {mockAlerts.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">High Priority Alert</p>
                <p className="text-sm text-foreground mt-1">{mockAlerts[0].message}</p>
                <p className="text-xs text-muted-foreground mt-1">{mockAlerts[0].time}</p>
              </div>
              <Button size="sm" variant="destructive">View</Button>
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
              <span className="text-2xl font-bold">12</span>
            </div>
            <p className="text-sm text-muted-foreground">Assigned Patients</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <span className="text-2xl font-bold">3</span>
            </div>
            <p className="text-sm text-muted-foreground">Today's Appointments</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-2xl font-bold">5</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending Notes</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-2xl font-bold">8</span>
            </div>
            <p className="text-sm text-muted-foreground">Reports Approved</p>
          </div>
        </div>

        {/* Today's Queue */}
        <section className="bg-card rounded-2xl p-5 shadow-food-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Today's Queue</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/professional/encounters")}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {mockQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {item.patientName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{item.patientName}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.time}</p>
                  <Badge variant="outline" className={
                    item.status === "waiting" ? "border-yellow-500/50 text-yellow-500" : "border-muted-foreground/50"
                  }>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
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
