import { 
  FileText, Download, Eye, Clock, Loader2, Share2, AlertTriangle, CheckCircle,
  Activity, Stethoscope, Heart, Shield, ChevronRight, Brain
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateText } from "@/lib/translation";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { normalizeLabResults } from "@/shared/lib/labResults";
import { useMyReports } from "@/shared/hooks/useHealthcare";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { toast } from "@/hooks/use-toast";
import {
  asReportRecord as asRecord,
  formatReportDateTime as formatDateTime,
  getReportFileName,
  getReportMarkdown,
  getReportRecommendedAction,
  getReportSummary,
  getReportTitle,
  reportArray as asStringArray,
  reportText as asText,
  toReportTitleCase as toTitleCase,
} from "@/shared/lib/reports";

const statusConfig: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
};

const urgencyConfig: Record<string, { label: string; className: string }> = {
  "non-urgent": { label: "Non-urgent", className: "border-green-500/30 bg-green-500/10 text-green-700" },
  "needs-attention": { label: "Needs attention", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  urgent: { label: "Urgent", className: "border-orange-500/30 bg-orange-500/10 text-orange-700" },
  emergency: { label: "Emergency", className: "border-red-500/30 bg-red-500/10 text-red-700" },
};

const reportActionButtonClass =
  "h-10 w-full justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-medium hover:bg-muted/70 sm:h-9 sm:w-auto sm:border-transparent sm:bg-transparent";

export default function PatientReports() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reports = [], isLoading } = useMyReports();
  const { language, currentLanguage } = useLanguage();
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedAction, setTranslatedAction] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const selectedReport = reportId ? reports.find((r: any) => r.id === reportId) : null;

  const toFileName = (report: any) => getReportFileName(report);

  const translateReportContent = async (summary: string, recommendedAction: string) => {
    if (!selectedReport) return;
    setIsTranslating(true);

    try {
      const [summaryTranslation, actionTranslation] = await Promise.all([
        translateText(summary, language),
        translateText(recommendedAction, language),
      ]);

      setTranslatedSummary(summaryTranslation);
      setTranslatedAction(actionTranslation);
      toast({ title: `Report translated to ${currentLanguage.nativeName}` });
    } catch (error) {
      toast({ title: "Translation failed", description: error instanceof Error ? error.message : "Could not translate report.", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    setTranslatedSummary(null);
    setTranslatedAction(null);
  }, [reportId, language]);

  const buildPdfBlob = async (report: any): Promise<Blob> => {
    const markdown = getReportMarkdown(report);
    const [{ default: html2pdf }, { marked }] = await Promise.all([
      import("html2pdf.js"),
      import("marked"),
    ]);
    const html = marked.parse(markdown);
    const container = document.createElement("div");
    container.innerHTML = html;
    container.style.background = "#ffffff";
    container.style.color = "#111827";
    container.style.padding = "24px";
    container.style.maxWidth = "800px";
    container.style.margin = "0 auto";
    container.style.fontFamily = "system-ui, -apple-system, sans-serif";
    container.style.fontSize = "14px";
    container.style.lineHeight = "1.5";

    // Add table styling
    const style = document.createElement("style");
    style.textContent = `
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 16px 0 !important;
      }
      th {
        background-color: #d1e7f5 !important;
        border: 1px solid #94b3d9 !important;
        padding: 10px !important;
        text-align: left !important;
        font-weight: 600 !important;
        color: #001a4d !important;
      }
      td {
        border: 1px solid #d4d4d8 !important;
        padding: 10px !important;
      }
      tr:nth-child(even) {
        background-color: #f8fafb !important;
      }
      h1 {
        color: #0066cc !important;
        border-bottom: 2px solid #0066cc !important;
        padding-bottom: 8px !important;
        margin-top: 20px !important;
        margin-bottom: 12px !important;
      }
      h2 {
        color: #0066cc !important;
        margin-top: 16px !important;
        margin-bottom: 10px !important;
      }
      p {
        margin: 8px 0 !important;
      }
    `;
    container.appendChild(style);
    document.body.appendChild(container);

    try {
      return await html2pdf().from(container).set({
        margin: 0.5,
        filename: toFileName(report),
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      }).outputPdf("blob");
    } finally {
      document.body.removeChild(container);
    }
  };

  const downloadReportPdf = async (report: any) => {
    try {
      const blob = await buildPdfBlob(report);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = toFileName(report);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded" });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({ title: "Download failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  const shareReport = async (report: any) => {
    try {
      const blob = await buildPdfBlob(report);
      const file = new File([blob], toFileName(report), { type: "application/pdf" });

      if (!navigator.share) {
        toast({ title: "Share unsupported", description: "Downloading PDF instead." });
        await downloadReportPdf(report);
        return;
      }

      const canShare = (navigator as any).canShare?.({ files: [file] }) ?? true;
      if (!canShare) {
        toast({ title: "Share unsupported", description: "Downloading PDF instead." });
        await downloadReportPdf(report);
        return;
      }

      await navigator.share({
        title: getReportTitle(report),
        text: "Medical report from Neo Synapse",
        files: [file],
      });
    } catch (error) {
      console.error("Share failed:", error);
      toast({ title: "Share cancelled or failed" });
    }
  };

  const downloadReportJson = (report: any) => {
    const payload = JSON.stringify(report.report_json ?? {}, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `patient-report-${report.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const renderReportDetail = (report: any) => {
    const reportData = asRecord(report.report_json) || {};
    const clinicalReport = asRecord(reportData.clinical_report);
    const clinicalPatient = asRecord(clinicalReport.patient);
    const clinicalComplaints = asRecord(clinicalReport.presenting_complaints);
    const legacyPatient = asRecord(reportData.patient);
    const patient = Object.keys(legacyPatient).length > 0 ? legacyPatient : clinicalPatient;
    const urgencyKey = asText(reportData.urgency).toLowerCase();
    const urgency = urgencyConfig[urgencyKey] || null;
    const summary = getReportSummary(report);
    const recommendedAction = getReportRecommendedAction(report);
    const reportType = asText(report.report_type) || "medical_report";
    const symptoms = asStringArray(reportData.symptoms).length > 0
      ? asStringArray(reportData.symptoms)
      : asStringArray(clinicalComplaints.symptoms);
    const warningSigns = asStringArray(reportData.warning_signs);
    const followUpQuestions = asStringArray(reportData.follow_up_questions).length > 0
      ? asStringArray(reportData.follow_up_questions)
      : asStringArray(reportData.questions);
    const possibleConditions = Array.isArray(reportData.possible_conditions)
      ? reportData.possible_conditions
        .map((item) => asRecord(item))
        .filter((item) => Object.keys(item).length > 0)
        .map((item, index) => ({
          index,
          name: asText(item?.name) || "Unknown condition",
          likelihood: asText(item?.likelihood) || "unknown",
          definition: asText(item?.definition) || "",
          reason: asText(item?.reason) || "",
          first_aid: asText(item?.first_aid) || "",
          treatments: asText(item?.treatments) || "",
          sources: Array.isArray(item?.sources) ? item.sources : [],
          confidence: typeof item?.confidence === "number" ? item.confidence : null,
        }))
      : [];
    const labResults = normalizeLabResults(reportData);

    // Extract assessment drivers
    const riskFactors = asStringArray(reportData.risk_factors || []);
    const medicalHistoryImpact = asStringArray(reportData.medical_history_impact || []);
    const medicationConsiderations = asStringArray(reportData.medication_considerations || []);
    const hasAssessmentDrivers = riskFactors.length > 0 || medicalHistoryImpact.length > 0 || medicationConsiderations.length > 0;

    // Urgency config with icons
    const urgencyIconMap: Record<string, typeof AlertTriangle> = {
      "non-urgent": CheckCircle,
      "needs-attention": Activity,
      "urgent": AlertTriangle,
      "emergency": AlertTriangle,
    };
    const UrgencyIcon = urgencyIconMap[urgencyKey] || AlertTriangle;

    return (
      <div className="mt-4 space-y-6">
        {/* Urgency Banner */}
        {urgency && (
          <div className={`rounded-2xl p-5 border ${urgency.className}`}>
            <div className="flex items-center gap-3 mb-2">
              <UrgencyIcon className="w-6 h-6" />
              <span className="font-display text-lg font-bold">{urgency.label}</span>
            </div>
            <p className="text-sm opacity-90">{summary}</p>
            <p className="text-xs text-muted-foreground mt-3">
              This guidance is from your assessment report. Consult your healthcare provider for personalized medical advice.
            </p>
          </div>
        )}

        {/* Report Metadata */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Report type</p>
            <p className="mt-1 text-sm font-medium text-foreground">{toTitleCase(reportType)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Generated on</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(reportData.generatedAt || report.created_at)}</p>
          </div>
        </div>

        {/* Summary Section */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-display font-semibold">Summary</h3>
            {language !== "en" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => translateReportContent(summary, recommendedAction)}
                disabled={isTranslating}
              >
                {isTranslating ? "Translating..." : `Translate to ${currentLanguage.nativeName}`}
              </Button>
            )}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{translatedSummary ?? summary}</p>
        </div>

        {/* Assessment Drivers */}
        {hasAssessmentDrivers && (
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Assessment drivers
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {riskFactors.length > 0 && (
                <div className="rounded-xl border border-border/70 bg-background p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Factors</p>
                  <ul className="space-y-1.5">
                    {riskFactors.slice(0, 5).map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {medicalHistoryImpact.length > 0 && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Medical History Impact</p>
                  <ul className="space-y-1.5">
                    {medicalHistoryImpact.slice(0, 4).map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {medicationConsiderations.length > 0 && (
                <div className="rounded-xl border border-border/70 bg-background p-3 sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medication Review</p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {medicationConsiderations.slice(0, 4).map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Possible Conditions */}
        {possibleConditions.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Possible causes to discuss with your clinician
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These are possible explanations based on your reported symptoms. Consult your healthcare provider for confirmation.
            </p>
            <div className="space-y-3">
              {possibleConditions.map((condition) => (
                <details key={`${condition.name}-${condition.index}`} className="group rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {condition.index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-5">{condition.name}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {condition.reason || condition.definition}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge 
                        variant="outline" 
                        className={
                          condition.likelihood === "high" 
                            ? "border-orange-500/50 text-orange-500" 
                            : condition.likelihood === "medium" 
                            ? "border-yellow-500/50 text-yellow-500" 
                            : "border-muted-foreground/50 text-muted-foreground"
                        }
                      >
                        {condition.likelihood}
                      </Badge>
                      {condition.confidence && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {Math.round(condition.confidence)}% confidence
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </div>
                  </summary>

                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {condition.definition && (
                      <div>
                        <p className="text-sm leading-6 text-foreground">{condition.definition}</p>
                      </div>
                    )}
                    {condition.reason && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this fits</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{condition.reason}</p>
                      </div>
                    )}
                    {condition.first_aid && (
                      <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">First aid now:</span> {condition.first_aid}
                        </p>
                      </div>
                    )}
                    {condition.treatments && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Treatment context</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{condition.treatments}</p>
                      </div>
                    )}
                    {condition.sources.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Sources:</span> {condition.sources.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Lab Results */}
        {labResults.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
            <h3 className="font-display font-semibold mb-3">Lab Results</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Each lab result shows the reference range, how the value compares, and a short explanation.
            </p>
            <div className="space-y-3">
              {labResults.map((result) => (
                <div key={`${result.label}-${result.rawValue}`} className="rounded-2xl border border-border/80 bg-muted/50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-foreground">{result.label}</p>
                    <Badge variant="outline" className={`capitalize ${
                      result.status === "normal"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        : result.status === "low"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-700"
                        : result.status === "high"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                        : result.status === "critical"
                        ? "border-red-500/30 bg-red-500/10 text-red-700"
                        : "border-slate-500/30 bg-slate-500/10 text-slate-700"
                    }`}>
                      {result.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Value:</span> {result.rawValue}{result.units ? ` ${result.units}` : ""}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reference range:</span> {result.referenceRange ?? "Not provided"}
                    </div>
                  </div>
                  {result.explanation && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Action */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Recommended next step
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">{translatedAction ?? recommendedAction}</p>
        </div>

        {/* Warning Signs */}
        {warningSigns.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Warning signs to watch for
            </h3>
            <ul className="space-y-2">
              {warningSigns.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Questions */}
        {followUpQuestions.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-5">
            <h3 className="font-display font-semibold mb-3">Questions to ask during your consultation</h3>
            <ul className="space-y-2">
              {followUpQuestions.map((question, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Patient Details and Symptoms */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Patient details</h3>
            <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between gap-3">
                <dt>Age</dt>
                <dd className="font-medium text-foreground">{asText(patient.age) || "Not provided"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Sex</dt>
                <dd className="font-medium text-foreground">{toTitleCase(asText(patient.gender) || "not provided")}</dd>
              </div>
              {(asText(reportData.duration) || asText(clinicalComplaints.duration)) && (
                <div className="flex justify-between gap-3">
                  <dt>Duration</dt>
                  <dd className="font-medium text-foreground">{asText(reportData.duration) || asText(clinicalComplaints.duration)}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Reported symptoms</h3>
            {symptoms.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {symptoms.map((symptom) => (
                  <li key={symptom}>• {symptom}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No symptoms were listed.</p>
            )}
          </div>
        </div>

        {/* Technical JSON Data */}
        <details className="rounded-xl border border-border bg-muted/20 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Show technical report data (JSON)</summary>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs">
            {JSON.stringify(reportData, null, 2)}
          </pre>
        </details>

        {/* Export Actions */}
        <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 min-[420px]:grid-cols-3 sm:flex sm:border-t-0 sm:pt-0">
          <Button size="sm" className={reportActionButtonClass} onClick={() => downloadReportJson(report)}>
            <Download className="w-4 h-4" /> Export JSON
          </Button>
          <Button size="sm" variant="outline" className={reportActionButtonClass} onClick={() => downloadReportPdf(report)}>
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" className={reportActionButtonClass} onClick={() => shareReport(report)}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!selectedReport) return;
    if (searchParams.get("action") !== "export") return;

    downloadReportJson(selectedReport);
    setSearchParams({}, { replace: true });
  }, [searchParams, selectedReport, setSearchParams]);

  if (authLoading) {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-xl">
          <EmptyStateCard
            icon={FileText}
            title="Sign in to view reports"
            description="Access your medical reports and clinical documentation"
            actionLabel="Sign In"
            onAction={() => navigate("/auth/sign-in")}
            iconContainerClassName="bg-muted"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Medical Reports</h1>
          <p className="text-muted-foreground">Your clinical documentation and health records</p>
        </div>

        {reportId && !isLoading && !selectedReport && (
          <div className="bg-card rounded-2xl p-5 border border-border text-sm text-destructive">
            Report not found for this route parameter.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const reportData = report.report_json as Record<string, unknown> | null;
              const title = getReportTitle(report);
              const doctor = (reportData?.doctor as string) || "Healthcare Provider";
              const status = (reportData?.status as string) || "approved";
              const isOpenReport = report.id === reportId;

              return (
                <div key={report.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium break-words">{title}</p>
                        <p className="text-xs text-muted-foreground">{doctor}</p>
                      </div>
                    </div>
                    <Badge className={`self-start shrink-0 ${statusConfig[status] || statusConfig.approved}`}>
                      {status}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <span>•</span>
                      <span>{report.report_type}</span>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:border-t-0 sm:pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={reportActionButtonClass}
                        onClick={() => navigate(`/patient/reports/${report.id}`)}
                      >
                        <Eye className="w-4 h-4" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={reportActionButtonClass}
                        onClick={() => navigate(`/patient/reports/${report.id}?action=export`)}
                      >
                        <Download className="w-4 h-4" /> Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={reportActionButtonClass}
                        onClick={() => void downloadReportPdf(report)}
                      >
                        <Download className="w-4 h-4" /> PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={reportActionButtonClass}
                        onClick={() => void shareReport(report)}
                      >
                        <Share2 className="w-4 h-4" /> Share
                      </Button>
                    </div>
                  </div>

                  {isOpenReport && (
                    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="font-semibold">Report Detail</h2>
                          <p className="text-sm text-muted-foreground">Report ID: {report.id}</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/patient/reports") }>
                          Back to Reports
                        </Button>
                      </div>
                      {renderReportDetail(report)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyStateCard
            icon={FileText}
            title="No Reports Yet"
            description="Your medical reports will appear here after consultations."
            actionLabel="Book Consultation"
            onAction={() => navigate("/patient/telemedicine")}
          />
        )}

        <div className="bg-secondary/30 rounded-2xl p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            💡 How Reports are Generated
          </h3>
          <p className="text-sm text-muted-foreground">
            During telemedicine consultations with recording consent enabled, Neo Synapse automatically 
            transcribes the conversation and generates a structured medical report. The doctor reviews 
            and approves it before it appears here.
          </p>
        </div>
      </div>
    </div>
  );
}
