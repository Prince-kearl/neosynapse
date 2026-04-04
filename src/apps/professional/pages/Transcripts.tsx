import { FileText, Loader2, Eye } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessionalTranscripts, useProfileNames } from "@/shared/hooks/useHealthcare";
import { EncounterFilterBanner } from "@/apps/professional/components/EncounterFilterBanner";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAuth } from "@/contexts/AuthContext";
import { clinicalNoteService, auditLogService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";
import { TransitionTimeline } from "@/apps/professional/components/TransitionTimeline";

export default function ProfessionalTranscripts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { transcriptId } = useParams<{ transcriptId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: transcripts = [], isLoading } = useProfessionalTranscripts();
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const { data: ownAuditLogs = [] } = useQuery({
    queryKey: ["own-audit-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await auditLogService.getOwn();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!transcriptId,
  });
  const encounterFilterId = searchParams.get("encounterId")?.trim() || null;

  const filteredTranscripts = encounterFilterId
    ? transcripts.filter((t: any) => t.encounter_id === encounterFilterId)
    : transcripts;

  const patientIds = filteredTranscripts.map((t: any) => t.encounters?.patient_id).filter(Boolean);
  const { data: nameMap = {} } = useProfileNames(patientIds);
  const selectedTranscript = transcriptId ? transcripts.find((t: any) => t.id === transcriptId) : null;
  const selectedTranscriptAuditTimeline = selectedTranscript
    ? ownAuditLogs.filter((log: any) =>
      (log.entity_type === "transcript" && log.entity_id === selectedTranscript.id) ||
      log.metadata?.transcript_id === selectedTranscript.id ||
      log.metadata?.encounter_id === selectedTranscript.encounter_id
    )
    : [];

  const hasContent = (json: any) => json && Object.keys(json).length > 0;

  const generateNoteDraftFromTranscript = async () => {
    if (!selectedTranscript || !user?.id) return;

    const draftPayload = {
      source: "transcript_review",
      transcript_id: selectedTranscript.id,
      encounter_id: selectedTranscript.encounter_id,
      generated_at: new Date().toISOString(),
      transcript_json: selectedTranscript.transcript_json ?? {},
      speaker_map: selectedTranscript.speaker_map ?? {},
      sections: {
        chief_complaint: "",
        history_of_present_illness: "",
        assessment: "",
        plan: "",
        follow_up: "",
      },
    };

    setIsGeneratingDraft(true);
    const { data: encounterNotes, error: existingError } = await clinicalNoteService.getForEncounter(selectedTranscript.encounter_id);
    if (existingError) {
      setIsGeneratingDraft(false);
      toast({ title: "Could not check existing notes", description: existingError.message, variant: "destructive" });
      return;
    }

    const existingNote = (encounterNotes || [])[0];

    if (existingNote && existingNote.status !== "finalized") {
      const { error: updateError } = await clinicalNoteService.updateDraft(existingNote.id, draftPayload);
      setIsGeneratingDraft(false);
      if (updateError) {
        toast({ title: "Failed to update note draft", description: updateError.message, variant: "destructive" });
        return;
      }

      await auditLogService.log({
        actor_id: user.id,
        action: "transcript_to_note_draft_updated",
        entity_type: "clinical_note",
        entity_id: existingNote.id,
        metadata: {
          transcript_id: selectedTranscript.id,
          encounter_id: selectedTranscript.encounter_id,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
      toast({ title: "Draft note updated from transcript" });
      navigate(`/professional/notes/${existingNote.id}/edit?encounterId=${selectedTranscript.encounter_id}`);
      return;
    }

    const { data: createdNotes, error: createError } = await clinicalNoteService.create({
      encounter_id: selectedTranscript.encounter_id,
      draft_json: draftPayload,
    });
    setIsGeneratingDraft(false);

    if (createError) {
      toast({ title: "Failed to create note draft", description: createError.message, variant: "destructive" });
      return;
    }

    const createdNote = Array.isArray(createdNotes) ? createdNotes[0] : createdNotes;
    const createdId = (createdNote as any)?.id;

    await auditLogService.log({
      actor_id: user.id,
      action: "transcript_to_note_draft_created",
      entity_type: "clinical_note",
      entity_id: createdId,
      metadata: {
        transcript_id: selectedTranscript.id,
        encounter_id: selectedTranscript.encounter_id,
      },
    });

    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    toast({ title: "Draft note created from transcript" });

    if (createdId) {
      navigate(`/professional/notes/${createdId}/edit?encounterId=${selectedTranscript.encounter_id}`);
      return;
    }

    navigate(`/professional/notes?encounterId=${selectedTranscript.encounter_id}`);
  };

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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={generateNoteDraftFromTranscript}
                    disabled={isGeneratingDraft}
                  >
                    {isGeneratingDraft ? "Generating..." : "Generate Draft Note"}
                  </Button>
                </div>
                <TransitionTimeline
                  title="Transcript Transition History"
                  events={selectedTranscriptAuditTimeline}
                  emptyLabel="No transcript-related transitions recorded yet."
                />
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
