import { FileCheck, Download, Eye, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessionalReports } from "@/shared/hooks/useHealthcare";

export default function ProfessionalReports() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: reports = [], isLoading } = useProfessionalReports();
  const selectedReport = reportId ? reports.find((r: any) => r.id === reportId) : null;

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

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Reports</h1>
          <p className="text-muted-foreground">Finalized clinical documents and reports</p>
        </div>

        {reportId && (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Report Detail</h2>
                <p className="text-sm text-muted-foreground">Route: /professional/reports/{reportId}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/professional/reports")}>
                Back to Reports
              </Button>
            </div>

            {!isLoading && !selectedReport && (
              <p className="text-sm text-destructive">Report not found for this route parameter.</p>
            )}

            {selectedReport && (
              <>
                <div className="text-sm text-muted-foreground">Type: {selectedReport.report_type}</div>
                <pre className="rounded-xl border border-border bg-muted/30 p-3 text-xs overflow-x-auto">
                  {JSON.stringify(selectedReport.report_json ?? {}, null, 2)}
                </pre>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => downloadReportJson(selectedReport)}>
                    <Download className="w-4 h-4 mr-1" /> Export JSON
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
        ) : reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report: any) => (
              <div key={report.id} className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.report_type} • {new Date(report.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-500">
                      approved
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/professional/reports/${report.id}`)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
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
          <div className="bg-card rounded-2xl p-8 text-center border border-border">
            <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reports are generated after encounters are completed and notes finalized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
