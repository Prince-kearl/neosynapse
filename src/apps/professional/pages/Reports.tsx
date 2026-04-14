import { FileCheck, Download, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfessionalReports } from "@/shared/hooks/useHealthcare";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useAuth } from "@/contexts/AuthContext";
import { medicalReportService, auditLogService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";
import { TransitionTimeline } from "@/apps/professional/components/TransitionTimeline";

export default function ProfessionalReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { reportId } = useParams<{ reportId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reports = [], isLoading } = useProfessionalReports();
  const selectedReport = reportId ? reports.find((r: any) => r.id === reportId) : null;
  const [reportEditorText, setReportEditorText] = useState("{}");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const { data: ownAuditLogs = [] } = useQuery({
    queryKey: ["own-audit-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await auditLogService.getOwn();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!selectedReport,
  });

  const { data: activeTemplates = [] } = useQuery({
    queryKey: ["pro-report-templates"],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("admin_document_templates")
        .select("id, name, template_type, content, is_active, is_default")
        .eq("is_active", true)
        .eq("category", "report")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedReport,
  });

  const selectedReportAuditTimeline = selectedReport
    ? ownAuditLogs.filter((log: any) =>
      (log.entity_type === "medical_report" && log.entity_id === selectedReport.id) ||
      log.metadata?.encounter_id === selectedReport.encounter_id
    )
    : [];

  const getReportStatus = (report: any) => {
    const status = report?.report_json?.status;
    return typeof status === "string" && status.trim().length > 0 ? status : "finalized";
  };

  const getReportStatusClass = (status: string) => {
    if (status === "approved" || status === "finalized") return "border-emerald-500/50 text-emerald-500";
    if (status === "review" || status === "in_review") return "border-yellow-500/50 text-yellow-500";
    if (status === "draft") return "border-blue-500/50 text-blue-500";
    return "border-primary/50 text-primary";
  };

  const downloadReportJson = (report: any) => {
    const payload = JSON.stringify(report.report_json ?? {}, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `report-${report.id}.json`;
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

  useEffect(() => {
    if (!selectedReport) return;
    setReportEditorText(JSON.stringify(selectedReport.report_json ?? {}, null, 2));
  }, [selectedReport?.id, selectedReport?.created_at]);

  const reportTypeToTemplateType = (reportType: string | null | undefined) => {
    const value = (reportType || "").toLowerCase();
    if (value.includes("lab")) return "lab_report";
    if (value.includes("radiology")) return "radiology_report";
    if (value.includes("follow")) return "follow_up_report";
    return "consultation_report";
  };

  useEffect(() => {
    if (!selectedReport) return;
    if (!activeTemplates.length) {
      setSelectedTemplateId("none");
      return;
    }

    const mappedType = reportTypeToTemplateType(selectedReport.report_type);
    const defaultForType = activeTemplates.find((t: any) => t.is_default && t.template_type === mappedType);
    const fallbackDefault = activeTemplates.find((t: any) => t.is_default);
    const chosen = defaultForType || fallbackDefault;
    setSelectedTemplateId(chosen ? chosen.id : "none");
  }, [selectedReport?.id, selectedReport?.report_type, activeTemplates]);

  const applySelectedTemplate = () => {
    if (!selectedReport || selectedTemplateId === "none") return;
    const template = activeTemplates.find((t: any) => t.id === selectedTemplateId);
    if (!template) return;

    const currentJson = parseReportEditorJson();
    if (currentJson === null) return;

    const hasContent = Object.keys(currentJson).length > 0;
    if (hasContent && !window.confirm("Applying a template will replace current report draft content. Continue?")) {
      return;
    }

    const templatedJson = {
      template_id: template.id,
      template_name: template.name,
      template_type: template.template_type,
      report_type: selectedReport.report_type,
      content: template.content,
      status: getReportStatus(selectedReport),
      generated_from_template: true,
    };

    setReportEditorText(JSON.stringify(templatedJson, null, 2));
    toast({ title: "Template applied", description: `${template.name} loaded into report draft.` });
  };

  const parseReportEditorJson = () => {
    try {
      return JSON.parse(reportEditorText || "{}");
    } catch {
      toast({ title: "Invalid report JSON", description: "Please fix JSON formatting before saving.", variant: "destructive" });
      return null;
    }
  };

  const persistReportStatus = async (toStatus: "draft" | "review" | "finalized", setPending: (value: boolean) => void) => {
    if (!selectedReport || !user?.id) return;

    const currentStatus = getReportStatus(selectedReport);
    if (toStatus === "review" && currentStatus !== "draft") {
      toast({ title: "Invalid transition", description: "Only draft reports can be submitted for review.", variant: "destructive" });
      return;
    }
    if (toStatus === "finalized" && currentStatus !== "review") {
      toast({ title: "Invalid transition", description: "Only reports in review can be finalized.", variant: "destructive" });
      return;
    }
    if (currentStatus === "finalized" && toStatus !== "finalized") {
      toast({ title: "Finalized report is read-only", description: "Create a revision to make changes." });
      return;
    }

    const parsed = parseReportEditorJson();
    if (!parsed) return;
    if ((toStatus === "review" || toStatus === "finalized") && Object.keys(parsed).length === 0) {
      toast({ title: "Report is empty", description: "Add report content before moving status.", variant: "destructive" });
      return;
    }

    const mergedJson = {
      ...parsed,
      status: toStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    setPending(true);
    const { error } = await medicalReportService.update(selectedReport.id, { report_json: mergedJson });
    setPending(false);

    if (error) {
      toast({ title: "Failed to update report", description: error.message, variant: "destructive" });
      return;
    }

    await auditLogService.log({
      actor_id: user.id,
      action: `medical_report_${toStatus === "review" ? "submitted_for_review" : toStatus === "finalized" ? "finalized" : "saved_draft"}`,
      entity_type: "medical_report",
      entity_id: selectedReport.id,
      metadata: {
        encounter_id: selectedReport.encounter_id,
        from_status: getReportStatus(selectedReport),
        to_status: toStatus,
      },
    });

    queryClient.invalidateQueries({ queryKey: ["pro-reports", user.id] });
    toast({ title: `Report ${toStatus === "review" ? "submitted for review" : toStatus}` });
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Reports</h1>
          <p className="text-muted-foreground">Finalized clinical documents and reports</p>
        </div>

        {reportId && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Report Detail</h2>
                <p className="text-sm text-muted-foreground">Report ID: {reportId}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/professional/reports")}>
                Back to Reports
              </Button>
            </div>

            {!isLoading && !selectedReport && (
              <p className="text-sm text-destructive">Report not found for this route parameter.</p>
            )}

            {selectedReport && (
              <>
                <div className="text-sm text-muted-foreground">Type: {selectedReport.report_type}</div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="Choose report template" />
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
                    className="w-full sm:w-auto"
                    onClick={applySelectedTemplate}
                    disabled={selectedTemplateId === "none"}
                  >
                    Apply Template
                  </Button>
                  {selectedReport.report_type && (
                    <span className="text-xs text-muted-foreground">
                      Suggested type: {reportTypeToTemplateType(selectedReport.report_type).replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <textarea
                  value={reportEditorText}
                  onChange={(e) => setReportEditorText(e.target.value)}
                  rows={14}
                  className="w-full resize-y rounded-xl border border-border bg-muted/30 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button size="sm" className="w-full sm:w-auto justify-start sm:justify-center" onClick={() => downloadReportJson(selectedReport)}>
                    <Download className="w-4 h-4 mr-1" /> Export JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto justify-start sm:justify-center"
                    onClick={() => persistReportStatus("draft", setIsSavingDraft)}
                    disabled={isSavingDraft || getReportStatus(selectedReport) === "finalized"}
                  >
                    {isSavingDraft ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-auto justify-start sm:justify-center"
                    onClick={() => persistReportStatus("review", setIsSubmittingReview)}
                    disabled={isSubmittingReview || getReportStatus(selectedReport) !== "draft"}
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto justify-start sm:justify-center"
                    onClick={() => persistReportStatus("finalized", setIsFinalizing)}
                    disabled={isFinalizing || getReportStatus(selectedReport) !== "review"}
                  >
                    {isFinalizing ? "Finalizing..." : "Finalize Report"}
                  </Button>
                </div>
                <TransitionTimeline
                  title="Report Transition History"
                  events={selectedReportAuditTimeline}
                  emptyLabel="No report transitions recorded yet."
                />
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report: any) => (
              <div key={report.id} className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium break-words">{report.patientName}</p>
                      <p className="text-sm text-muted-foreground break-words">
                        {report.report_type} • {new Date(report.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                    <Badge variant="outline" className={`col-span-2 justify-center sm:col-span-1 sm:justify-start ${getReportStatusClass(getReportStatus(report))}`}>
                      {getReportStatus(report)}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-3" onClick={() => navigate(`/professional/reports/${report.id}`)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start px-2 sm:w-auto sm:justify-center sm:px-3"
                      onClick={() => navigate(`/professional/reports/${report.id}?action=export`)}
                    >
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            icon={FileCheck}
            title="No reports yet"
            description="Reports are generated after encounters are completed and notes finalized."
            compact
          />
        )}
      </div>
    </div>
  );
}
