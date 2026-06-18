import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, FileText, Clock, AlertCircle, PenTool, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patientProfileService, medicalHistoryService } from "@/shared/services/healthcare";
import { useClinicalNotesForAssignedPatient, useMedicalHistoryForAssignedPatient, useMedicalHistoryFilesForAssignedPatient, useProfileNames, useReportsForAssignedPatient } from "@/shared/hooks/useHealthcare";
import { buildMedicalHistoryContext } from "@/shared/lib/medicalHistory";
import { buildClinicalNoteMarkdown, getClinicalNoteTitle } from "@/shared/lib/clinicalNotes";
import { getLinkedNoteId, getLinkedTranscriptId, getReportSourceLabel, getReportStatus, getReportSummary, getReportTitle, toReportTitleCase } from "@/shared/lib/reports";
import type { MedicalHistory } from "@/shared/types/healthcare";

const patientDetailActionButtonClass =
  "h-10 w-full justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-border sm:bg-transparent";

export default function PatientDetail() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch patient profile
  useEffect(() => {
    if (!patientId) return;
    
    (async () => {
      try {
        const { data, error } = await patientProfileService.getForAssignedPatient(patientId);
        if (error) {
          console.error("Failed to fetch patient profile:", error);
        }
        setPatientProfile(data);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [patientId]);

  // Fetch medical history and files
  const { data: medicalHistory, isLoading: historyLoading } = useMedicalHistoryForAssignedPatient(patientId);
  const { data: files = [], isLoading: filesLoading } = useMedicalHistoryFilesForAssignedPatient(patientId);
  const { data: clinicalNotes = [], isLoading: notesLoading } = useClinicalNotesForAssignedPatient(patientId);
  const { data: reports = [], isLoading: reportsLoading } = useReportsForAssignedPatient(patientId);

  // Fetch patient name
  const { data: nameMap = {} } = useProfileNames(patientId ? [patientId] : []);
  const patientName = nameMap[patientId!] || patientProfile?.display_name || "Patient";

  const isLoading = profileLoading || historyLoading || filesLoading || notesLoading || reportsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!patientProfile) {
    return (
      <div className="flex-1 min-h-screen bg-background p-4 lg:p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load patient information</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasUploadedDocuments = files.length > 0;
  const medicalHistoryContext = buildMedicalHistoryContext(medicalHistory, files);

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="break-words font-display text-2xl font-bold lg:text-3xl">{patientName}</h1>
              <p className="break-all text-sm text-muted-foreground">{patientId}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="medical-history">Medical History</TabsTrigger>
            <TabsTrigger value="clinical-notes">Clinical Notes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Basic profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {patientProfile.date_of_birth && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                      <p className="text-base">
                        {new Date(patientProfile.date_of_birth).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                  {patientProfile.gender && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gender</p>
                      <p className="text-base capitalize">{patientProfile.gender}</p>
                    </div>
                  )}
                  {patientProfile.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-base">{patientProfile.phone}</p>
                    </div>
                  )}
                  {patientProfile.emergency_contact_name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                      <p className="text-base">{patientProfile.emergency_contact_name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Medical Documentation Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasUploadedDocuments ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                    {files.length} document{files.length !== 1 ? "s" : ""} uploaded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                    No documents uploaded yet
                  </Badge>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="medical-history" className="space-y-4">
            {medicalHistory ? (
              <>
                {medicalHistory.existing_conditions && medicalHistory.existing_conditions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Existing Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {medicalHistory.existing_conditions.map((condition, i) => (
                          <Badge key={i} variant="secondary">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {medicalHistory.allergies && medicalHistory.allergies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Allergies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {medicalHistory.allergies.map((allergy, i) => (
                          <Badge key={i} variant="destructive">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {medicalHistory.current_medications && medicalHistory.current_medications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {medicalHistory.current_medications.map((med, i) => (
                          <li key={i} className="text-sm">
                            • {med}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {medicalHistory.past_surgeries && medicalHistory.past_surgeries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Past Surgeries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {medicalHistory.past_surgeries.map((surgery, i) => (
                          <li key={i} className="text-sm">
                            • {surgery}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {medicalHistory.family_medical_history && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Family Medical History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{medicalHistory.family_medical_history}</p>
                    </CardContent>
                  </Card>
                )}

                {medicalHistory.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{medicalHistory.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {!medicalHistory.existing_conditions?.length &&
                  !medicalHistory.allergies?.length &&
                  !medicalHistory.current_medications?.length &&
                  !medicalHistory.past_surgeries?.length &&
                  !medicalHistory.family_medical_history &&
                  !medicalHistory.notes && (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                          No medical history information provided yet.
                        </p>
                      </CardContent>
                    </Card>
                  )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    No medical history profile found. Patient may not have completed onboarding.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clinical-notes" className="space-y-4">
            {clinicalNotes.length > 0 ? (
              clinicalNotes.map((note: any) => {
                const noteJson = note.final_json ?? note.draft_json ?? {};
                return (
                  <Card key={note.id}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <PenTool className="h-5 w-5 text-primary" />
                            {getClinicalNoteTitle(noteJson)}
                          </CardTitle>
                          <CardDescription>
                            {note.encounters?.encounter_type || "Consultation"} •{" "}
                            {new Date(note.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="self-start capitalize">
                          {note.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                        {buildClinicalNoteMarkdown(noteJson, {
                          patientName,
                          encounterType: note.encounters?.encounter_type || "Consultation",
                        })}
                      </div>
                      <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap sm:border-t-0 sm:pt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className={patientDetailActionButtonClass}
                          onClick={() => navigate(`/professional/notes/${note.id}/edit?encounterId=${note.encounter_id}`)}
                        >
                          Open Note
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={patientDetailActionButtonClass}
                          onClick={() => navigate(`/professional/encounters?encounterId=${note.encounter_id}`)}
                        >
                          Open Encounter
                        </Button>
                        <Button
                          size="sm"
                          className={patientDetailActionButtonClass}
                          onClick={() => navigate(`/professional/transcripts?encounterId=${note.encounter_id}`)}
                        >
                          Open Transcript
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No clinical notes have been created for this patient yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            {reports.length > 0 ? (
              reports.map((report: any) => {
                const noteId = getLinkedNoteId(report);
                const transcriptId = getLinkedTranscriptId(report);
                return (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileCheck className="h-5 w-5 text-primary" />
                            {getReportTitle(report)}
                          </CardTitle>
                          <CardDescription>
                            {toReportTitleCase(report.report_type || "medical report")} • {getReportSourceLabel(report)} •{" "}
                            {new Date(report.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="self-start capitalize">
                          {getReportStatus(report)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="rounded-lg border border-border bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                        {getReportSummary(report)}
                      </p>
                      <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:border-t-0 sm:pt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className={patientDetailActionButtonClass}
                          onClick={() => navigate(`/professional/reports/${report.id}`)}
                        >
                          Open Report
                        </Button>
                        {noteId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={patientDetailActionButtonClass}
                            onClick={() => navigate(`/professional/notes/${noteId}/edit?encounterId=${report.encounter_id}`)}
                          >
                            Open Source Note
                          </Button>
                        )}
                        {transcriptId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={patientDetailActionButtonClass}
                            onClick={() => navigate(`/professional/transcripts/${transcriptId}`)}
                          >
                            Open Transcript
                          </Button>
                        )}
                        {report.encounter_id && (
                          <Button
                            size="sm"
                            className={patientDetailActionButtonClass}
                            onClick={() => navigate(`/professional/encounters?encounterId=${report.encounter_id}`)}
                          >
                            Open Encounter
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No medical reports have been generated for this patient yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {hasUploadedDocuments ? (
              <div className="space-y-3">
                {files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.document_type && `${file.document_type} • `}
                              {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : "Size unknown"} •{" "}
                              {new Date(file.created_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const { data, error } = await medicalHistoryService.createSignedUrl(file.file_path);
                              if (error) throw error;
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, "_blank");
                              }
                            } catch (err) {
                              console.error("Failed to open file:", err);
                            }
                          }}
                        >
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* AI Context Preview (for reference) */}
        {medicalHistoryContext && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Context Summary</CardTitle>
              <CardDescription>Information available to AI assistant for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                {medicalHistoryContext}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
