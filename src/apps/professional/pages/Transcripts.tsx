import { FileText, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessionalTranscripts, useProfileNames } from "@/shared/hooks/useHealthcare";

export default function ProfessionalTranscripts() {
  const { data: transcripts = [], isLoading } = useProfessionalTranscripts();

  const patientIds = transcripts.map((t: any) => t.encounters?.patient_id).filter(Boolean);
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const hasContent = (json: any) => json && Object.keys(json).length > 0;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Transcripts</h1>
          <p className="text-muted-foreground">Review AI-generated consultation transcripts</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transcripts.length > 0 ? (
          <div className="space-y-3">
            {transcripts.map((transcript: any) => {
              const enc = transcript.encounters;
              const patientName = enc?.patient_id ? (nameMap[enc.patient_id] || "Patient") : "Patient";
              const ready = hasContent(transcript.transcript_json);
              return (
                <div key={transcript.id} className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transcript.created_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })} • {enc?.encounter_type || "consultation"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        ready ? "border-emerald-500/50 text-emerald-500" : "border-yellow-500/50 text-yellow-500"
                      }>
                        {ready ? "ready" : "processing"}
                      </Badge>
                      <Button variant="outline" size="sm" disabled={!ready}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 text-center border border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No transcripts available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Transcripts are generated after recorded consultations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
