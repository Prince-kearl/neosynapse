import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMedicalHistory, useMedicalHistoryFiles, usePatientProfile } from "@/shared/hooks/useHealthcare";
import { medicalHistoryService, patientProfileService } from "@/shared/services/healthcare";
import { parseListInput, stringifyListInput } from "@/shared/lib/medicalHistory";
import type { MedicalHistoryFile } from "@/shared/types/healthcare";

const steps = [
  { title: "Current Health", description: "Conditions, allergies, and medicines" },
  { title: "History", description: "Surgeries, family history, and clinical notes" },
  { title: "Documents", description: "Upload reports and finalize your profile" },
];

type HistoryFormState = {
  conditions: string;
  allergies: string;
  medications: string;
  surgeries: string;
  familyHistory: string;
  notes: string;
};

const initialForm: HistoryFormState = {
  conditions: "",
  allergies: "",
  medications: "",
  surgeries: "",
  familyHistory: "",
  notes: "",
};

export default function MedicalHistorySetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isOnboarding = location.pathname.includes("/onboarding/");
  const nextPath = searchParams.get("next") || "/patient/dashboard";

  const { data: medicalHistory, isLoading: historyLoading } = useMedicalHistory();
  const { data: historyFiles = [], isLoading: filesLoading } = useMedicalHistoryFiles();
  const { data: patientProfile } = usePatientProfile();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<HistoryFormState>(initialForm);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!medicalHistory) return;
    setForm({
      conditions: stringifyListInput(medicalHistory.existing_conditions),
      allergies: stringifyListInput(medicalHistory.allergies),
      medications: stringifyListInput(medicalHistory.current_medications),
      surgeries: stringifyListInput(medicalHistory.past_surgeries),
      familyHistory: medicalHistory.family_medical_history || "",
      notes: medicalHistory.notes || "",
    });
    setPrivacyConfirmed(!!medicalHistory.privacy_acknowledged_at);
  }, [medicalHistory]);

  const progressValue = ((stepIndex + 1) / steps.length) * 100;
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const summaryStats = useMemo(() => {
    const conditionCount = parseListInput(form.conditions).length;
    const allergyCount = parseListInput(form.allergies).length;
    const medicationCount = parseListInput(form.medications).length;
    const surgeryCount = parseListInput(form.surgeries).length;
    return { conditionCount, allergyCount, medicationCount, surgeryCount };
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();
      const payload = {
        existing_conditions: parseListInput(form.conditions),
        allergies: parseListInput(form.allergies),
        current_medications: parseListInput(form.medications),
        past_surgeries: parseListInput(form.surgeries),
        family_medical_history: form.familyHistory.trim() || null,
        notes: form.notes.trim() || null,
        onboarding_completed: true,
        privacy_acknowledged_at: privacyConfirmed ? (medicalHistory?.privacy_acknowledged_at || now) : null,
        completed_at: medicalHistory?.completed_at || now,
        last_reviewed_at: now,
        updated_at: now,
      };

      const { data: savedHistory, error: historyError } = await medicalHistoryService.upsert(user.id, payload);
      if (historyError) throw historyError;

      const baseInsuranceInfo = (patientProfile?.insurance_info as Record<string, unknown> | null) || {};
      const { error: profileError } = await patientProfileService.upsert(user.id, {
        insurance_info: {
          ...baseInsuranceInfo,
          conditions: payload.existing_conditions,
          allergies: payload.allergies,
          medications: payload.current_medications,
        },
        updated_at: now,
      });
      if (profileError) {
        console.warn("Medical history saved, but patient profile mirror failed:", profileError);
      }

      const uploadedFiles: string[] = [];
      const failedFiles: Array<{ name: string; message: string }> = [];
      for (const file of queuedFiles) {
        const upload = await medicalHistoryService.uploadFile(user.id, file);
        if (upload.error) {
          failedFiles.push({ name: file.name, message: upload.error.message });
          continue;
        }

        const { error: fileError } = await medicalHistoryService.createFile({
          medical_history_id: savedHistory.id,
          user_id: user.id,
          storage_bucket: "medical-history-documents",
          file_path: upload.filePath,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          document_type: "medical_record",
        });
        if (fileError) {
          failedFiles.push({ name: file.name, message: fileError.message });
          await medicalHistoryService.deleteStorageFiles([upload.filePath]);
          continue;
        }

        uploadedFiles.push(file.name);
      }

      return { savedHistory, uploadedFiles, failedFiles };
    },
    onSuccess: ({ savedHistory, failedFiles }) => {
      setQueuedFiles((prev) => prev.filter((file) => failedFiles.some((failed) => failed.name === file.name)));
      // Optimistically update the cache BEFORE navigating
      // so PatientGuard sees the updated value immediately and doesn't redirect back.
      queryClient.setQueryData(["medical-history", user?.id], savedHistory);
      queryClient.invalidateQueries({ queryKey: ["medical-history", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["medical-history-files", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["patient-profile", user?.id] });

      if (failedFiles.length > 0) {
        toast({
          title: "Medical history saved",
          description: `${failedFiles.length} document${failedFiles.length === 1 ? "" : "s"} could not be uploaded. The saved health record is still available to Neo Synapse and your care team.`,
        });
      } else {
        toast({ title: "Medical history saved", description: "Your health record is secure and confidential." });
      }

      if (isOnboarding) {
        navigate(nextPath, { replace: true });
        return;
      }
    },
    onError: (error) => {
      toast({
        title: "Unable to save medical history",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (file: MedicalHistoryFile) => {
      const { error: storageError } = await medicalHistoryService.deleteStorageFiles([file.file_path]);
      if (storageError) throw storageError;

      const { error } = await medicalHistoryService.deleteFileRecord(file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-history-files", user?.id] });
      toast({ title: "Document removed" });
    },
    onError: (error) => {
      toast({
        title: "Unable to remove document",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleQueueFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setQueuedFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const removeQueuedFile = (targetFile: File) => {
    setQueuedFiles((prev) => prev.filter((file) => file !== targetFile));
  };

  const openExistingFile = async (file: MedicalHistoryFile) => {
    setOpeningFileId(file.id);
    const { data, error } = await medicalHistoryService.createSignedUrl(file.file_path);
    setOpeningFileId(null);

    if (error || !data?.signedUrl) {
      toast({ title: "Unable to open file", description: "Please try again.", variant: "destructive" });
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (historyLoading || filesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              {isOnboarding ? "Patient Onboarding" : "Medical History"}
            </Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {isOnboarding ? "Set up your medical history" : "Update your medical history"}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Help Neo Synapse personalize AI guidance, improve symptom analysis, and keep your records accurate over time.
            </p>
          </div>
          {!isOnboarding && (
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <Card className="border-primary/15 bg-card/95 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{`Step ${stepIndex + 1} of ${steps.length}: ${currentStep.title}`}</CardTitle>
                <CardDescription>{currentStep.description}</CardDescription>
              </div>
              <div className="text-xs text-muted-foreground">
                {medicalHistory?.onboarding_completed ? "Previously completed" : "Required for first-time setup"}
              </div>
            </div>
            <Progress value={progressValue} className="h-2" />
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="space-y-5">
              {stepIndex === 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="conditions">Existing conditions</Label>
                    <Textarea
                      id="conditions"
                      value={form.conditions}
                      onChange={(event) => setForm((prev) => ({ ...prev, conditions: event.target.value }))}
                      placeholder="e.g. Diabetes, Hypertension, Asthma"
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">Separate items with commas or line breaks.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={form.allergies}
                      onChange={(event) => setForm((prev) => ({ ...prev, allergies: event.target.value }))}
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                      className="min-h-[110px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medications">Current medications</Label>
                    <Textarea
                      id="medications"
                      value={form.medications}
                      onChange={(event) => setForm((prev) => ({ ...prev, medications: event.target.value }))}
                      placeholder="e.g. Metformin 500mg twice daily"
                      className="min-h-[110px]"
                    />
                  </div>
                </>
              )}

              {stepIndex === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="surgeries">Past surgeries</Label>
                    <Textarea
                      id="surgeries"
                      value={form.surgeries}
                      onChange={(event) => setForm((prev) => ({ ...prev, surgeries: event.target.value }))}
                      placeholder="e.g. Appendectomy in 2020"
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="familyHistory">Family medical history</Label>
                    <Textarea
                      id="familyHistory"
                      value={form.familyHistory}
                      onChange={(event) => setForm((prev) => ({ ...prev, familyHistory: event.target.value }))}
                      placeholder="Optional: family conditions such as hypertension, sickle cell disease, or stroke"
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Anything else your care team or AI assistant should know"
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                    <div className="mb-3 flex items-center gap-2 text-foreground">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium">Privacy notice</span>
                    </div>
                    <p>
                      Your data is stored securely and used for care, AI guidance, symptom triage, and appointment context as described in the{" "}
                      <a href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                        Privacy Policy
                      </a>
                      .
                    </p>
                    <div className="mt-4 flex items-start gap-3">
                      <Checkbox
                        id="privacy-confirmed"
                        checked={privacyConfirmed}
                        onCheckedChange={(checked) => setPrivacyConfirmed(checked === true)}
                      />
                      <Label htmlFor="privacy-confirmed" className="text-sm font-normal leading-6">
                        I understand this information will be stored securely and used to personalize care, AI guidance, symptom triage, and appointment review.
                      </Label>
                    </div>
                  </div>
                </>
              )}

              {stepIndex === 2 && (
                <>
                  <div className="space-y-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
                    <div className="space-y-1">
                      <Label htmlFor="medical-history-files">Upload medical documents</Label>
                      <p className="text-sm text-muted-foreground">
                        Add PDFs, images, DOCX files, lab results, prescriptions, or discharge summaries.
                      </p>
                    </div>
                    <Input
                      id="medical-history-files"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.csv"
                      onChange={handleQueueFiles}
                    />
                  </div>

                  {queuedFiles.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Files ready to upload</p>
                      <div className="space-y-2">
                        {queuedFiles.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Upload className="h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="break-all text-sm font-medium text-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeQueuedFile(file)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Uploaded documents</p>
                    {historyFiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                        No medical documents uploaded yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {historyFiles.map((file) => (
                          <div key={file.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="break-all text-sm font-medium text-foreground">{file.file_name}</p>
                                <p className="text-xs text-muted-foreground">{file.document_type.replace(/_/g, " ")}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => void openExistingFile(file)}
                                disabled={openingFileId === file.id}
                              >
                                {openingFileId === file.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Open
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => deleteFileMutation.mutate(file)}
                                disabled={deleteFileMutation.isPending}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={stepIndex === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {!isLastStep ? (
                  <Button type="button" onClick={() => setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !privacyConfirmed}
                  >
                    {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {isOnboarding ? "Complete setup" : "Save updates"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg">Profile snapshot</CardTitle>
                  <CardDescription>What Neo Synapse can use right now.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Conditions</span>
                    <Badge variant="secondary">{summaryStats.conditionCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Allergies</span>
                    <Badge variant="secondary">{summaryStats.allergyCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Medications</span>
                    <Badge variant="secondary">{summaryStats.medicationCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Past surgeries</span>
                    <Badge variant="secondary">{summaryStats.surgeryCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Documents on file</span>
                    <Badge variant="secondary">{historyFiles.length + queuedFiles.length}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/15 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary">
                    <Lock className="h-4 w-4" />
                    <CardTitle className="text-lg">Why this matters</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Neo Synapse uses your saved history to personalize AI responses and improve symptom analysis accuracy.</p>
                  <p>Your medical history remains editable anytime, and new uploads can be added as your record evolves.</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
