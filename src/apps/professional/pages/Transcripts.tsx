import { ClipboardList, FileText, Loader2, Eye, Sparkles } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessionalTranscripts, useProfileNames } from "@/shared/hooks/useHealthcare";
import { EncounterFilterBanner } from "@/apps/professional/components/EncounterFilterBanner";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAuth } from "@/contexts/AuthContext";
import { clinicalNoteService, auditLogService, medicalReportService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";
import { TransitionTimeline } from "@/apps/professional/components/TransitionTimeline";
import {
  buildFallbackConsultationArtifacts,
  extractTranscriptText,
} from "@/shared/lib/consultationArtifacts";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalSettings } from "@/shared/hooks/useProfessionalSettings";

const transcriptActionButtonClass =
  "h-10 w-full justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-border sm:bg-transparent";

export default function ProfessionalTranscripts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useProfessionalSettings();
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

  const generateDocumentationFromTranscript = async () => {
    if (!selectedTranscript || !user?.id) return;
    const enc = selectedTranscript.encounters;
    const patientName = enc?.patient_id ? (nameMap[enc.patient_id] || "Patient") : "Patient";
    const transcriptText = extractTranscriptText(selectedTranscript.transcript_json);

    if (!transcriptText) {
      toast({
        title: "Transcript has no readable text",
        description: "The transcript must contain text before AI documentation can be drafted.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDraft(true);

    let artifacts = buildFallbackConsultationArtifacts({
      transcriptText,
      patientName,
      doctorName: user.email || "Healthcare professional",
      encounterId: selectedTranscript.encounter_id,
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-consultation-artifacts", {
        body: {
          transcriptText,
          transcriptJson: selectedTranscript.transcript_json ?? {},
          encounterId: selectedTranscript.encounter_id,
          patientName,
          doctorName: user.email || "Healthcare professional",
        },
      });

      if (error) throw error;
      if (data && typeof data === "object") {
        artifacts = {
          ...artifacts,
          ...(data as typeof artifacts),
          report: {
            ...artifacts.report,
            ...((data as any).report || {}),
            status: "draft",
            patient: patientName,
            doctor: (data as any).report?.doctor || user.email || "Healthcare professional",
          },
        };
      }
    } catch (error) {
      console.error("AI consultation artifact generation failed; using fallback draft:", error);
      toast({
        title: "AI generation fallback used",
        description: "A conservative draft was created. You can regenerate after deploying/configuring the AI function.",
      });
    }

    const draftPayload = {
      source: "transcript_review",
      transcript_id: selectedTranscript.id,
      encounter_id: selectedTranscript.encounter_id,
      generated_at: new Date().toISOString(),
      transcript_json: selectedTranscript.transcript_json ?? {},
      speaker_map: selectedTranscript.speaker_map ?? {},
      sections: artifacts.soap_note,
      soap_note: artifacts.soap_note,
      sop_draft: artifacts.sop_draft,
      medical_report: artifacts.report,
    };

    const { data: encounterNotes, error: existingError } = await clinicalNoteService.getForEncounter(selectedTranscript.encounter_id);
    if (existingError) {
      setIsGeneratingDraft(false);
      toast({ title: "Could not check existing notes", description: existingError.message, variant: "destructive" });
      return;
    }

    const existingNote = (encounterNotes || [])[0];
    let noteId: string | null = null;

    if (existingNote && existingNote.status !== "finalized") {
      const { error: updateError } = await clinicalNoteService.updateDraft(existingNote.id, draftPayload);
      if (updateError) {
        setIsGeneratingDraft(false);
        toast({ title: "Failed to update note draft", description: updateError.message, variant: "destructive" });
        return;
      }
      noteId = existingNote.id;

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
    } else {
      const { data: createdNotes, error: createError } = await clinicalNoteService.create({
        encounter_id: selectedTranscript.encounter_id,
        draft_json: draftPayload,
      });

      if (createError) {
        setIsGeneratingDraft(false);
        toast({ title: "Failed to create note draft", description: createError.message, variant: "destructive" });
        return;
      }

      const createdNote = Array.isArray(createdNotes) ? createdNotes[0] : createdNotes;
      noteId = (createdNote as any)?.id || null;

      await auditLogService.log({
        actor_id: user.id,
        action: "transcript_to_note_draft_created",
        entity_type: "clinical_note",
        entity_id: noteId || undefined,
        metadata: {
          transcript_id: selectedTranscript.id,
          encounter_id: selectedTranscript.encounter_id,
        },
      });
    }

    const reportJson = {
      ...artifacts.report,
      source: "telemedicine_transcript",
      transcript_id: selectedTranscript.id,
      encounter_id: selectedTranscript.encounter_id,
      soap_note: artifacts.soap_note,
      sop_draft: artifacts.sop_draft,
      quality_flags: (artifacts as any).quality_flags || [],
    };

    if (enc?.patient_id) {
      const { data: existingReports, error: reportFetchError } = await medicalReportService.getForEncounter(selectedTranscript.encounter_id);
      if (reportFetchError) {
        console.error("Could not check existing medical reports:", reportFetchError);
      }

      const existingReport = (existingReports || []).find((report: any) => report.report_type === "telemedicine_consultation");
      if (existingReport) {
        const { error: updateReportError } = await medicalReportService.update(existingReport.id, { report_json: reportJson });
        if (updateReportError) {
          setIsGeneratingDraft(false);
          toast({ title: "Failed to update medical report", description: updateReportError.message, variant: "destructive" });
          return;
        }
      } else {
        const { error: createReportError } = await medicalReportService.create({
          patient_id: enc.patient_id,
          encounter_id: selectedTranscript.encounter_id,
          report_type: "telemedicine_consultation",
          report_json: reportJson,
        });
        if (createReportError) {
          setIsGeneratingDraft(false);
          toast({ title: "Failed to create medical report", description: createReportError.message, variant: "destructive" });
          return;
        }
      }

      await auditLogService.log({
        actor_id: user.id,
        action: "transcript_to_medical_report_draft",
        entity_type: "medical_report",
        metadata: {
          transcript_id: selectedTranscript.id,
          encounter_id: selectedTranscript.encounter_id,
          note_id: noteId,
        },
      });
    }

    setIsGeneratingDraft(false);
    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    queryClient.invalidateQueries({ queryKey: ["pro-reports", user.id] });
    toast({ title: "AI documentation drafts created", description: "Report, SOAP note, and SOP draft are ready for professional review." });

    navigate(noteId ? `/professional/notes/${noteId}/edit?encounterId=${selectedTranscript.encounter_id}` : `/professional/notes?encounterId=${selectedTranscript.encounter_id}`);
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
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Consultation Transcript</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {extractTranscriptText(selectedTranscript.transcript_json) || "No readable transcript text is available yet."}
                  </div>
                </div>
                <pre className="rounded-xl border border-border bg-muted/30 p-3 text-xs overflow-x-auto">
                  {JSON.stringify(selectedTranscript.transcript_json ?? {}, null, 2)}
                </pre>
                <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 min-[420px]:grid-cols-2 sm:flex sm:border-t-0 sm:pt-0">
                  <Button
                    size="sm"
                    className={transcriptActionButtonClass}
                    onClick={() => navigate(`/professional/notes?encounterId=${selectedTranscript.encounter_id}`)}
                  >
                    Open Notes Queue
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className={transcriptActionButtonClass}
                    onClick={generateDocumentationFromTranscript}
                    disabled={isGeneratingDraft}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratingDraft ? "Generating..." : "Generate Report + SOAP/SOP"}
                  </Button>
                </div>
                {settings.activityLoggingVisible && (
                  <TransitionTimeline
                    title="Transcript Transition History"
                    events={selectedTranscriptAuditTimeline}
                    emptyLabel="No transcript-related transitions recorded yet."
                  />
                )}
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
                  <div className="space-y-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center sm:h-12 sm:w-12">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{patientName}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transcript.created_at).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric",
                              })} • {enc?.encounter_type || "consultation"}
                            </p>
                          </div>
                          <Badge variant="outline" className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs ${ready ? "border-emerald-500/50 text-emerald-500" : "border-yellow-500/50 text-yellow-500"}`}>
                            {ready ? "ready" : "processing"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:flex sm:justify-end sm:border-t-0 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className={transcriptActionButtonClass}
                        disabled={!ready}
                        onClick={() => navigate(`/professional/transcripts/${transcript.id}`)}
                      >
                        <Eye className="w-4 h-4" /> Review
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
