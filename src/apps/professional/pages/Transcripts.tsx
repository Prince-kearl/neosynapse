import { FileText, Loader2, Eye } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessionalTranscripts, useProfileNames } from "@/shared/hooks/useHealthcare";
import { EncounterFilterBanner } from "@/apps/professional/components/EncounterFilterBanner";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

export default function ProfessionalTranscripts() {
  const navigate = useNavigate();
  const { transcriptId } = useParams<{ transcriptId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: transcripts = [], isLoading } = useProfessionalTranscripts();
  const encounterFilterId = searchParams.get("encounterId")?.trim() || null;

  const filteredTranscripts = encounterFilterId
    ? transcripts.filter((t: any) => t.encounter_id === encounterFilterId)
    : transcripts;

  const patientIds = filteredTranscripts.map((t: any) => t.encounters?.patient_id).filter(Boolean);
  const { data: nameMap = {} } = useProfileNames(patientIds);
  const selectedTranscript = transcriptId ? transcripts.find((t: any) => t.id === transcriptId) : null;

  const hasContent = (json: any) => json && Object.keys(json).length > 0;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Transcripts</h1>
          <p className="text-muted-foreground">Review AI-generated consultation transcripts</p>
        </div>

        {encounterFilterId && (
          <EncounterFilterBanner
            encounterId={encounterFilterId}
            onClear={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("encounterId");
              setSearchParams(next, { replace: true });
            }}
          />
        )}

        {transcriptId && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Transcript Review</h2>
                <p className="text-sm text-muted-foreground">Transcript ID: {transcriptId}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/professional/transcripts")}>
                Back to Transcripts
              </Button>
            </div>

            {!isLoading && !selectedTranscript && (
              <p className="text-sm text-destructive">Transcript not found for this route parameter.</p>
            )}

            {selectedTranscript && (
              <>
                <div className="text-sm text-muted-foreground">
                  Encounter: {selectedTranscript.encounter_id}
                </div>
                <pre className="rounded-xl border border-border bg-muted/30 p-3 text-xs overflow-x-auto">
                  {JSON.stringify(selectedTranscript.transcript_json ?? {}, null, 2)}
                </pre>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/professional/notes?encounterId=${selectedTranscript.encounter_id}`)}
                  >
                    Open Notes Queue
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTranscripts.length > 0 ? (
          <div className="space-y-3">
            {filteredTranscripts.map((transcript: any) => {
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
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!ready}
                        onClick={() => navigate(`/professional/transcripts/${transcript.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyStateCard
            icon={FileText}
            title="No transcripts available"
            description="Transcripts are generated after recorded consultations."
            compact
          />
        )}
      </div>
    </div>
  );
}
