import { PenTool, Clock, CheckCircle, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfessionalEncounters, useProfessionalNotes, useProfileNames } from "@/shared/hooks/useHealthcare";
import { EncounterFilterBanner } from "@/apps/professional/components/EncounterFilterBanner";
import { useAuth } from "@/contexts/AuthContext";
import { clinicalNoteService, medicalReportService, auditLogService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";
import { TransitionTimeline } from "@/apps/professional/components/TransitionTimeline";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  finalized: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function ProfessionalNotes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { noteId } = useParams<{ noteId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: encounters = [] } = useProfessionalEncounters();
  const { data: notes = [], isLoading } = useProfessionalNotes();
  const encounterFilterId = searchParams.get("encounterId")?.trim() || null;

  const filteredNotes = encounterFilterId
    ? notes.filter((n: any) => n.encounter_id === encounterFilterId)
    : notes;

  // Include both note-linked patients and encounter-linked patients so manual note creation can resolve names.
  const patientIds = Array.from(new Set([
    ...filteredNotes.map((n: any) => n.encounters?.patient_id),
    ...encounters.map((enc: any) => enc.patient_id),
  ].filter(Boolean)));
  const { data: nameMap = {} } = useProfileNames(patientIds);

  const draftNotes = filteredNotes.filter((n: any) => n.status === "draft");
  const reviewNotes = filteredNotes.filter((n: any) => n.status === "review");
  const finalizedNotes = filteredNotes.filter((n: any) => n.status === "finalized");
  const selectedNote = noteId ? notes.find((n: any) => n.id === noteId) : null;
  const defaultTab = encounterFilterId && reviewNotes.length > 0 && draftNotes.length === 0 ? "review" : "draft";
  const [noteEditorText, setNoteEditorText] = useState("{}");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(encounterFilterId ?? "none");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const { data: ownAuditLogs = [] } = useQuery({
    queryKey: ["own-audit-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await auditLogService.getOwn();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!selectedNote,
  });

  const { data: activeTemplates = [] } = useQuery({
    queryKey: ["pro-note-templates"],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_document_templates")
        .select("id, name, template_type, content, is_active, is_default")
        .eq("is_active", true)
        .eq("category", "document")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedNote,
  });

  const selectedNoteAuditTimeline = selectedNote
    ? ownAuditLogs.filter((log: any) =>
      (log.entity_type === "clinical_note" && log.entity_id === selectedNote.id) ||
      (log.entity_type === "medical_report" && log.metadata?.note_id === selectedNote.id) ||
      log.metadata?.encounter_id === selectedNote.encounter_id
    )
    : [];

  const availableEncounters = encounters.filter((enc: any) => {
    if (encounterFilterId && enc.id !== encounterFilterId) return false;
    return true;
  });

  const noteCountByEncounter = notes.reduce((acc: Record<string, number>, note: any) => {
    acc[note.encounter_id] = (acc[note.encounter_id] || 0) + 1;
    return acc;
  }, {});

  const latestNoteByEncounter = notes.reduce((acc: Record<string, any>, note: any) => {
    if (!acc[note.encounter_id]) {
      acc[note.encounter_id] = note;
    }
    return acc;
  }, {});

  useEffect(() => {
    if (encounterFilterId && availableEncounters.some((enc: any) => enc.id === encounterFilterId)) {
      setSelectedEncounterId(encounterFilterId);
      return;
    }

    setSelectedEncounterId((current) => {
      if (current !== "none" && availableEncounters.some((enc: any) => enc.id === current)) {
        return current;
      }
      return availableEncounters[0]?.id ?? "none";
    });
  }, [encounterFilterId, availableEncounters]);

  useEffect(() => {
    if (!selectedNote) return;
    setNoteEditorText(JSON.stringify(selectedNote.final_json ?? selectedNote.draft_json ?? {}, null, 2));
  }, [selectedNote?.id, selectedNote?.updated_at]);

  useEffect(() => {
    if (!selectedNote) return;
    if (!activeTemplates.length) {
      setSelectedTemplateId("none");
      return;
    }

    const defaultForType = activeTemplates.find((t: any) => t.is_default && t.template_type === "clinical_note");
    const fallbackDefault = activeTemplates.find((t: any) => t.is_default);
    const chosen = defaultForType || fallbackDefault;
    setSelectedTemplateId(chosen ? chosen.id : "none");
  }, [selectedNote?.id, activeTemplates]);

  const applySelectedTemplate = () => {
    if (!selectedNote || selectedTemplateId === "none") return;
    const template = activeTemplates.find((t: any) => t.id === selectedTemplateId);
    if (!template) return;

    const currentJson = parseNoteEditorJson();
    if (currentJson === null) return;

    const hasContent = Object.keys(currentJson).length > 0;
    if (hasContent && !window.confirm("Applying a template will replace current draft content. Continue?")) {
      return;
    }

    const templatedJson = {
      template_id: template.id,
      template_name: template.name,
      template_type: template.template_type,
      content: template.content,
      generated_from_template: true,
    };

    setNoteEditorText(JSON.stringify(templatedJson, null, 2));
    toast({ title: "Template applied", description: `${template.name} loaded into note draft.` });
  };

  const parseNoteEditorJson = () => {
    try {
      return JSON.parse(noteEditorText || "{}");
    } catch {
      toast({ title: "Invalid note JSON", description: "Please fix JSON formatting before saving.", variant: "destructive" });
      return null;
    }
  };

  const syncReportFromFinalizedNote = async (note: any, finalJson: Record<string, unknown>) => {
    const patientId = note?.encounters?.patient_id;
    if (!patientId) return;

    const reportPayload = {
      status: "finalized",
      source: "clinical_note_finalized",
      note_id: note.id,
      encounter_id: note.encounter_id,
      generated_at: new Date().toISOString(),
      clinical_note: finalJson,
    };

    const { data: existingReports, error: existingError } = await medicalReportService.getForEncounter(note.encounter_id);
    if (existingError) {
      console.error("Failed checking existing report for encounter:", existingError);
      return;
    }

    if (existingReports && existingReports.length > 0) {
      const targetReport = existingReports[0];
      const { error } = await medicalReportService.update(targetReport.id, {
        report_json: {
          ...(targetReport.report_json as Record<string, unknown> | null),
          ...reportPayload,
        },
      });
      if (!error && user?.id) {
        await auditLogService.log({
          actor_id: user.id,
          action: "medical_report_updated_from_note",
          entity_type: "medical_report",
          entity_id: targetReport.id,
          metadata: { encounter_id: note.encounter_id, note_id: note.id },
        });
      }
      return;
    }

    const { data: created, error: createError } = await medicalReportService.create({
      patient_id: patientId,
      encounter_id: note.encounter_id,
      report_type: "clinical_summary",
      report_json: reportPayload,
    });

    if (!createError && user?.id) {
      const createdReport = Array.isArray(created) ? created[0] : created;
      await auditLogService.log({
        actor_id: user.id,
        action: "medical_report_created_from_note",
        entity_type: "medical_report",
        entity_id: (createdReport as any)?.id,
        metadata: { encounter_id: note.encounter_id, note_id: note.id },
      });
    }
  };

  const saveDraft = async () => {
    if (!selectedNote || !user?.id) return;
    if (selectedNote.status === "finalized") {
      toast({ title: "Finalized note is read-only", description: "Create a new note revision to continue." });
      return;
    }

    const parsed = parseNoteEditorJson();
    if (!parsed) return;

    setIsSavingDraft(true);
    const { error } = await clinicalNoteService.updateDraft(selectedNote.id, parsed);
    setIsSavingDraft(false);

    if (error) {
      toast({ title: "Failed to save draft", description: error.message, variant: "destructive" });
      return;
    }

    await auditLogService.log({
      actor_id: user.id,
      action: "clinical_note_saved_draft",
      entity_type: "clinical_note",
      entity_id: selectedNote.id,
      metadata: { encounter_id: selectedNote.encounter_id, from_status: selectedNote.status, to_status: "draft" },
    });

    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    toast({ title: "Draft saved" });
  };

  const submitForReview = async () => {
    if (!selectedNote || !user?.id) return;
    if (selectedNote.status !== "draft") {
      toast({ title: "Invalid transition", description: "Only draft notes can be submitted for review.", variant: "destructive" });
      return;
    }

    const parsed = parseNoteEditorJson();
    if (!parsed) return;
    if (Object.keys(parsed).length === 0) {
      toast({ title: "Draft is empty", description: "Add note content before submitting for review.", variant: "destructive" });
      return;
    }

    setIsSubmittingReview(true);
    const { error } = await clinicalNoteService.submitForReview(selectedNote.id);
    setIsSubmittingReview(false);

    if (error) {
      toast({ title: "Failed to submit note", description: error.message, variant: "destructive" });
      return;
    }

    await auditLogService.log({
      actor_id: user.id,
      action: "clinical_note_submitted_for_review",
      entity_type: "clinical_note",
      entity_id: selectedNote.id,
      metadata: { encounter_id: selectedNote.encounter_id, from_status: selectedNote.status, to_status: "review" },
    });

    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    toast({ title: "Submitted for review" });
  };

  const finalizeNote = async () => {
    if (!selectedNote || !user?.id) return;
    if (selectedNote.status !== "review") {
      toast({ title: "Invalid transition", description: "Only notes in review can be finalized.", variant: "destructive" });
      return;
    }

    const parsed = parseNoteEditorJson();
    if (!parsed) return;
    if (Object.keys(parsed).length === 0) {
      toast({ title: "Final note is empty", description: "Add note content before finalizing.", variant: "destructive" });
      return;
    }

    setIsFinalizing(true);
    const { error } = await clinicalNoteService.finalize(selectedNote.id, user.id, parsed);
    if (!error) {
      await syncReportFromFinalizedNote(selectedNote, parsed);
      await auditLogService.log({
        actor_id: user.id,
        action: "clinical_note_finalized",
        entity_type: "clinical_note",
        entity_id: selectedNote.id,
        metadata: { encounter_id: selectedNote.encounter_id, from_status: selectedNote.status, to_status: "finalized" },
      });
    }
    setIsFinalizing(false);

    if (error) {
      toast({ title: "Failed to finalize note", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    queryClient.invalidateQueries({ queryKey: ["pro-reports", user.id] });
    toast({ title: "Note finalized and report synced" });
  };

  const createNoteForEncounter = async (encounterId: string) => {
    if (!user?.id || encounterId === "none") return;

    const previousNote = latestNoteByEncounter[encounterId];
    const draftSeed = previousNote?.final_json ?? previousNote?.draft_json ?? {};

    setIsCreatingNote(true);
    const { data, error } = await clinicalNoteService.create({
      encounter_id: encounterId,
      draft_json: draftSeed,
    });
    setIsCreatingNote(false);

    if (error) {
      toast({ title: "Failed to create note", description: error.message, variant: "destructive" });
      return;
    }

    const createdNote = Array.isArray(data) ? data[0] : data;
    if (!createdNote?.id) {
      toast({ title: "Note created", description: "Refresh and open the new note if it does not appear immediately." });
      queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
      return;
    }

    await auditLogService.log({
      actor_id: user.id,
      action: "clinical_note_created",
      entity_type: "clinical_note",
      entity_id: createdNote.id,
      metadata: {
        encounter_id: encounterId,
        status: "draft",
        revision_of_note_id: previousNote?.id ?? null,
        revision_number: (noteCountByEncounter[encounterId] || 0) + 1,
      },
    });

    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    toast({
      title: previousNote ? "New revision created" : "Draft note created",
      description: previousNote ? "The new draft was prefilled from the latest note for this encounter." : undefined,
    });
    navigate(`/professional/notes/${createdNote.id}/edit?encounterId=${encounterId}`);
  };

  const createNote = async () => createNoteForEncounter(selectedEncounterId);

  const deleteNoteByRecord = async (note: any) => {
    if (!note || !user?.id) return;

    if (!window.confirm("Delete this clinical note? This action cannot be undone.")) {
      return;
    }

    setIsDeletingNote(true);
    const { error } = await clinicalNoteService.remove(note.id);
    setIsDeletingNote(false);

    if (error) {
      toast({ title: "Failed to delete note", description: error.message, variant: "destructive" });
      return;
    }

    await auditLogService.log({
      actor_id: user.id,
      action: "clinical_note_deleted",
      entity_type: "clinical_note",
      entity_id: note.id,
      metadata: { encounter_id: note.encounter_id, status: note.status },
    });

    queryClient.invalidateQueries({ queryKey: ["pro-clinical-notes", user.id] });
    toast({ title: "Note deleted" });
    if (selectedNote?.id === note.id) {
      navigate(encounterFilterId ? `/professional/notes?encounterId=${encounterFilterId}` : "/professional/notes");
    }
  };

  const deleteNote = async () => {
    if (!selectedNote) return;
    await deleteNoteByRecord(selectedNote);
  };

  const NoteCard = ({ note }: { note: any }) => {
    const patientId = note.encounters?.patient_id;
    const patientName = patientId ? (nameMap[patientId] || "Patient") : "Patient";
    const encounterType = note.encounters?.encounter_type || "Consultation";
    const revisionNumber = noteCountByEncounter[note.encounter_id]
      ? noteCountByEncounter[note.encounter_id] - filteredNotes.filter((item: any) => item.encounter_id === note.encounter_id && item.created_at > note.created_at).length
      : 1;

    return (
      <div className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline">Revision {revisionNumber}</Badge>
            <Badge className={statusConfig[note.status] || statusConfig.draft}>{note.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => createNoteForEncounter(note.encounter_id)} disabled={isCreatingNote}>
              <Plus className="w-4 h-4 mr-1" /> New Revision
            </Button>
            {note.status !== "finalized" && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/professional/notes/${note.id}/edit`)}>
                <Edit className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteNoteByRecord(note)}
              disabled={isDeletingNote}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
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
          <p className="text-muted-foreground">Create, review, update, and finalize clinical documentation</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-semibold">Create Clinical Note</h2>
              <p className="text-sm text-muted-foreground">Start a new draft for any assigned encounter. If notes already exist, a fresh revision will be created.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedEncounterId} onValueChange={setSelectedEncounterId}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Select encounter" />
                </SelectTrigger>
                <SelectContent>
                  {availableEncounters.length === 0 ? (
                    <SelectItem value="none" disabled>No encounters available</SelectItem>
                  ) : (
                    availableEncounters.map((enc: any) => {
                      const patientName = nameMap[enc.patient_id] || "Patient";
                      const encounterDate = new Date(enc.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      });
                      const revisionCount = noteCountByEncounter[enc.id] || 0;

                      return (
                        <SelectItem key={enc.id} value={enc.id}>
                          {`${patientName} • ${enc.encounter_type} • ${encounterDate}${revisionCount ? ` • ${revisionCount} note${revisionCount === 1 ? "" : "s"}` : ""}`}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button onClick={createNote} disabled={isCreatingNote || selectedEncounterId === "none"}>
                <Plus className="w-4 h-4 mr-2" />
                {isCreatingNote ? "Creating..." : "New Note"}
              </Button>
            </div>
          </div>
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

        {noteId && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Edit Note</h2>
                <p className="text-sm text-muted-foreground">Note ID: {noteId}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/professional/notes")}>
                Back to Notes
              </Button>
            </div>

            {!isLoading && !selectedNote && (
              <p className="text-sm text-destructive">Note not found for this route parameter.</p>
            )}

            {selectedNote && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Encounter: {selectedNote.encounter_id}</span>
                  <span>•</span>
                  <span>Status: {selectedNote.status}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="sm:w-72">
                      <SelectValue placeholder="Choose note template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {activeTemplates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex w-full items-center justify-between gap-2">
                            <span>{template.name}</span>
                            {template.is_default ? (
                              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                                Default (auto-selected)
                              </span>
                            ) : null}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applySelectedTemplate}
                    disabled={selectedTemplateId === "none"}
                  >
                    Apply Template
                  </Button>
                </div>
                <textarea
                  value={noteEditorText}
                  onChange={(e) => setNoteEditorText(e.target.value)}
                  rows={14}
                  className="w-full resize-y rounded-xl border border-border bg-muted/30 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={saveDraft} disabled={isSavingDraft || selectedNote.status === "finalized"}>
                    {isSavingDraft ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={submitForReview} disabled={isSubmittingReview || selectedNote.status !== "draft"}>
                    {isSubmittingReview ? "Submitting..." : "Submit For Review"}
                  </Button>
                  <Button size="sm" onClick={finalizeNote} disabled={isFinalizing || selectedNote.status !== "review"}>
                    {isFinalizing ? "Finalizing..." : "Finalize Note"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={deleteNote} disabled={isDeletingNote} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeletingNote ? "Deleting..." : "Delete Note"}
                  </Button>
                </div>
                <TransitionTimeline
                  title="Note Transition History"
                  events={selectedNoteAuditTimeline}
                  emptyLabel="No note transitions recorded yet."
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/professional/encounters?encounterId=${selectedNote.encounter_id}`)}
                  >
                    Open Encounter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/professional/transcripts?encounterId=${selectedNote.encounter_id}`)}
                  >
                    Open Transcript Queue
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <Tabs defaultValue={defaultTab}>
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
