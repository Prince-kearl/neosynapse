import { FileText, Download, Eye, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMyReports } from "@/shared/hooks/useHealthcare";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

const statusConfig: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function PatientReports() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: reports = [], isLoading } = useMyReports();

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
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">{doctor}</p>
                      </div>
                    </div>
                    <Badge className={statusConfig[status] || statusConfig.approved}>
                      {status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString("en-GB", { 
                        day: "numeric", 
                        month: "short", 
                        year: "numeric" 
                      })}
                      <span>•</span>
                      <span>{report.report_type}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8">
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8">
                        <Download className="w-4 h-4 mr-1" /> Export
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
