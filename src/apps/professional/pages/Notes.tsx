import { PenTool, Clock, CheckCircle, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// TODO: Fetch real clinical notes from database
const mockNotes = [
  { id: "1", patientName: "Ama Mensah", date: "2026-03-08T14:00:00Z", status: "draft", type: "Consultation" },
  { id: "2", patientName: "Kofi Asante", date: "2026-03-07T10:00:00Z", status: "review", type: "Follow-up" },
  { id: "3", patientName: "Efua Owusu", date: "2026-03-05T09:00:00Z", status: "finalized", type: "Consultation" },
];

const statusConfig: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  finalized: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function ProfessionalNotes() {
  const draftNotes = mockNotes.filter(n => n.status === "draft");
  const reviewNotes = mockNotes.filter(n => n.status === "review");
  const finalizedNotes = mockNotes.filter(n => n.status === "finalized");

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Clinical Notes</h1>
          <p className="text-muted-foreground">Review and finalize AI-generated clinical documentation</p>
        </div>

        <Tabs defaultValue="draft">
          <TabsList className="bg-muted">
            <TabsTrigger value="draft" className="gap-2">
              <PenTool className="w-4 h-4" />
              Drafts ({draftNotes.length})
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <Clock className="w-4 h-4" />
              In Review ({reviewNotes.length})
            </TabsTrigger>
            <TabsTrigger value="finalized" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Finalized ({finalizedNotes.length})
            </TabsTrigger>
          </TabsList>

          {["draft", "review", "finalized"].map((tab) => {
            const notes = tab === "draft" ? draftNotes : tab === "review" ? reviewNotes : finalizedNotes;
            return (
              <TabsContent key={tab} value={tab} className="mt-6 space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <PenTool className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{note.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {note.type} • {new Date(note.date).toLocaleDateString("en-GB", { 
                              day: "numeric", month: "short"
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusConfig[note.status]}>{note.status}</Badge>
                        {note.status !== "finalized" && (
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
                    <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No {tab} notes</p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
