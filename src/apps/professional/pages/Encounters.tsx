import { ClipboardList, Clock, Video, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// TODO: Fetch real encounters from database
const mockEncounters = [
  { id: "1", patientName: "Ama Mensah", type: "telemedicine", status: "in_progress", date: "2026-03-09T09:00:00Z" },
  { id: "2", patientName: "Kofi Asante", type: "telemedicine", status: "pending", date: "2026-03-09T09:30:00Z" },
  { id: "3", patientName: "Efua Owusu", type: "in_person", status: "completed", date: "2026-03-08T14:00:00Z" },
  { id: "4", patientName: "Kwame Boateng", type: "telemedicine", status: "completed", date: "2026-03-07T10:00:00Z" },
];

const statusConfig: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ProfessionalEncounters() {
  const navigate = useNavigate();

  const activeEncounters = mockEncounters.filter(e => ["pending", "in_progress"].includes(e.status));
  const completedEncounters = mockEncounters.filter(e => ["completed", "cancelled"].includes(e.status));

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Encounters</h1>
          <p className="text-muted-foreground">Manage patient consultations and encounters</p>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="bg-muted">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="w-4 h-4" />
              Active ({activeEncounters.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <FileText className="w-4 h-4" />
              Completed ({completedEncounters.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6 space-y-4">
            {activeEncounters.map((enc) => (
              <div key={enc.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {enc.patientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{enc.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(enc.date).toLocaleString("en-GB", { 
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                        {" • "}{enc.type === "telemedicine" ? "Video" : "In-person"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusConfig[enc.status]}>{enc.status.replace("_", " ")}</Badge>
                    {enc.type === "telemedicine" && (
                      <Button size="sm" onClick={() => navigate("/professional/telemedicine")}>
                        <Video className="w-4 h-4 mr-1" /> Join
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {activeEncounters.length === 0 && (
              <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active encounters</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 space-y-4">
            {completedEncounters.map((enc) => (
              <div key={enc.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                      {enc.patientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{enc.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(enc.date).toLocaleString("en-GB", { 
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusConfig[enc.status]}>{enc.status}</Badge>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
