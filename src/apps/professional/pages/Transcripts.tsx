import { FileText, Clock, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// TODO: Fetch real transcripts from database
const mockTranscripts = [
  { id: "1", patientName: "Ama Mensah", date: "2026-03-08T14:00:00Z", duration: "15 min", status: "ready" },
  { id: "2", patientName: "Kofi Asante", date: "2026-03-07T10:00:00Z", duration: "22 min", status: "processing" },
  { id: "3", patientName: "Efua Owusu", date: "2026-03-05T09:00:00Z", duration: "18 min", status: "ready" },
];

export default function ProfessionalTranscripts() {
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Transcripts</h1>
          <p className="text-muted-foreground">Review AI-generated consultation transcripts</p>
        </div>

        <div className="space-y-4">
          {mockTranscripts.map((transcript) => (
            <div key={transcript.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{transcript.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transcript.date).toLocaleDateString("en-GB", { 
                        day: "numeric", month: "short", year: "numeric" 
                      })} • {transcript.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={
                    transcript.status === "ready" ? "border-green-500/50 text-green-500" : "border-yellow-500/50 text-yellow-500"
                  }>
                    {transcript.status}
                  </Badge>
                  <Button variant="outline" size="sm" disabled={transcript.status !== "ready"}>
                    <Eye className="w-4 h-4 mr-1" /> Review
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {mockTranscripts.length === 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No transcripts available</p>
          </div>
        )}
      </div>
    </div>
  );
}
