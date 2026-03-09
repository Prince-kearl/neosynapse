import { PenTool, Clock, CheckCircle, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfessionalNotes, useProfileNames } from "@/shared/hooks/useHealthcare";

const statusConfig: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  finalized: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function ProfessionalNotes() {
  const { data: notes = [], isLoading } = useProfessionalNotes();

  // Extract patient IDs from the joined encounter data
  const patientIds = notes.map((n: any) => n.encounters?.patient_id).filter(Boolean);
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const draftNotes = notes.filter((n: any) => n.status === "draft");
  const reviewNotes = notes.filter((n: any) => n.status === "review");
  const finalizedNotes = notes.filter((n: any) => n.status === "finalized");

  const NoteCard = ({ note }: { note: any }) => {
    const patientId = note.encounters?.patient_id;
    const patientName = patientId ? (nameMap[patientId] || "Patient") : "Patient";
    const encounterType = note.encounters?.encounter_type || "Consultation";

    return (
      <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <PenTool className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{patientName}</p>
              <p className="text-sm text-muted-foreground">
                {encounterType} • {new Date(note.created_at).toLocaleDateString("en-GB", { 
                  day: "numeric", month: "short"
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusConfig[note.status] || statusConfig.draft}>{note.status}</Badge>
            {note.status !== "finalized" && (
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

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

          {[
            { key: "draft", items: draftNotes },
            { key: "review", items: reviewNotes },
            { key: "finalized", items: finalizedNotes },
          ].map(({ key, items }) => (
            <TabsContent key={key} value={key} className="mt-6 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : items.length > 0 ? (
                items.map((note: any) => <NoteCard key={note.id} note={note} />)
              ) : (
                <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
                  <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No {key} notes</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
