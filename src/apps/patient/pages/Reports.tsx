import { FileText, Download, Eye, Clock, Loader2, Share2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMyReports } from "@/shared/hooks/useHealthcare";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { toast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { marked } from "marked";

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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];

const toTitleCase = (value: string): string =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value: unknown): string => {
  if (typeof value !== "string") return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PatientReports() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reports = [], isLoading } = useMyReports();
  const selectedReport = reportId ? reports.find((r: any) => r.id === reportId) : null;

  const getReportTitle = (report: any) => {
    const reportData = report?.report_json as Record<string, unknown> | null;
    return (reportData?.title as string) || `${report?.report_type || "medical"} report`;
  };

  const getReportMarkdown = (report: any) => {
    const reportData = report?.report_json as Record<string, unknown> | null;
    const markdown = typeof reportData?.markdown === "string" ? reportData.markdown : "";
    if (markdown.trim()) return markdown;
    return `# ${getReportTitle(report)}\n\n\`\`\`json\n${JSON.stringify(report?.report_json ?? {}, null, 2)}\n\`\`\``;
  };

  const toFileName = (report: any) =>
    `${String(getReportTitle(report)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "medical-report"}-${new Date(report.created_at || Date.now()).toISOString().slice(0, 10)}.pdf`;

  const buildPdfBlob = async (report: any): Promise<Blob> => {
    const markdown = getReportMarkdown(report);
    const html = marked.parse(markdown);
    const container = document.createElement("div");
    container.innerHTML = html;
    container.style.background = "#ffffff";
    container.style.color = "#111827";
    container.style.padding = "24px";
    container.style.maxWidth = "800px";
    container.style.margin = "0 auto";
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

        {reportId && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Report Detail</h2>
                <p className="text-sm text-muted-foreground">Report ID: {reportId}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/patient/reports")}>
                Back to Reports
              </Button>
            </div>

            {!isLoading && !selectedReport && (
              <p className="text-sm text-destructive">Report not found for this route parameter.</p>
            )}

            {selectedReport && (
              <>
                {(() => {
                  const reportData = asRecord(selectedReport.report_json) || {};
                  const patient = asRecord(reportData.patient) || {};
                  const urgencyKey = asText(reportData.urgency).toLowerCase();
                  const urgency = urgencyConfig[urgencyKey] || null;
                  const summary = asText(reportData.summary) || "No summary is available for this report yet.";
                  const recommendedAction = asText(reportData.recommended_action) || "No recommended next step was provided.";
                  const reportType = asText(selectedReport.report_type) || "medical_report";
                  const symptoms = asStringArray(reportData.symptoms);
                  const warningSigns = asStringArray(reportData.warning_signs);
                  const followUpQuestions = asStringArray(reportData.follow_up_questions).length > 0
                    ? asStringArray(reportData.follow_up_questions)
                    : asStringArray(reportData.questions);
                  const possibleConditions = Array.isArray(reportData.possible_conditions)
                    ? reportData.possible_conditions
                      .map((item) => asRecord(item))
                      .filter(Boolean)
                      .map((item) => ({
                        name: asText(item?.name) || "Unknown condition",
                        likelihood: asText(item?.likelihood) || "unknown",
                      }))
                    : [];

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Report type</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{toTitleCase(reportType)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Generated on</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(reportData.generatedAt || selectedReport.created_at)}</p>
                        </div>
                      </div>

                      {urgency && (
                        <div className={`rounded-xl border px-4 py-3 ${urgency.className}`}>
                          <p className="text-xs uppercase tracking-wide">Urgency level</p>
                          <p className="text-base font-semibold">{urgency.label}</p>
                        </div>
                      )}

                      <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Summary</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Recommended next step</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendedAction}</p>
                      </div>

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
                            {asText(reportData.duration) && (
                              <div className="flex justify-between gap-3">
                                <dt>Duration</dt>
                                <dd className="font-medium text-foreground">{asText(reportData.duration)}</dd>
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

                      {possibleConditions.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <h3 className="text-sm font-semibold text-foreground">Possible causes to discuss with your clinician</h3>
                          <div className="mt-3 space-y-2">
                            {possibleConditions.map((condition) => (
                              <div key={`${condition.name}-${condition.likelihood}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3">
                                <p className="text-sm text-foreground">{condition.name}</p>
                                <Badge variant="outline" className="capitalize">{condition.likelihood}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {warningSigns.length > 0 && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                          <h3 className="text-sm font-semibold text-red-700">Warning signs to watch for</h3>
                          <ul className="mt-2 space-y-1 text-sm text-red-700/90">
                            {warningSigns.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {followUpQuestions.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <h3 className="text-sm font-semibold text-foreground">Questions to ask during your consultation</h3>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {followUpQuestions.map((question) => (
                              <li key={question}>• {question}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <details className="rounded-xl border border-border bg-muted/20 p-4">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">Show technical report data (JSON)</summary>
                        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs">
                          {JSON.stringify(selectedReport.report_json ?? {}, null, 2)}
                        </pre>
                      </details>
                    </div>
                  );
                })()}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" className="w-full sm:w-auto justify-start sm:justify-center" onClick={() => downloadReportJson(selectedReport)}>
                    <Download className="w-4 h-4 mr-1" /> Export JSON
                  </Button>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto justify-start sm:justify-center" onClick={() => downloadReportPdf(selectedReport)}>
                    <Download className="w-4 h-4 mr-1" /> Download PDF
                  </Button>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto justify-start sm:justify-center" onClick={() => shareReport(selectedReport)}>
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                </div>
              </>
            )}
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
              const title = (reportData?.title as string) || `${report.report_type} Report`;
              const doctor = (reportData?.doctor as string) || "Healthcare Provider";
              const status = (reportData?.status as string) || "approved";

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
                        year: "numeric" 
                      })}
                      <span>•</span>
                      <span>{report.report_type}</span>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-3"
                        onClick={() => navigate(`/patient/reports/${report.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-3"
                        onClick={() => navigate(`/patient/reports/${report.id}?action=export`)}
                      >
                        <Download className="w-4 h-4 mr-1" /> Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-3"
                        onClick={() => void downloadReportPdf(report)}
                      >
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-3"
                        onClick={() => void shareReport(report)}
                      >
                        <Share2 className="w-4 h-4 mr-1" /> Share
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
