import { useState } from "react";
import { FileText, Download, Eye, Clock, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface MockReport {
  id: string;
  title: string;
  type: string;
  date: string;
  status: "draft" | "reviewed" | "approved";
  doctor: string;
}

const mockReports: MockReport[] = [
  { id: "1", title: "General Consultation Report", type: "Consultation", date: "2026-03-01", status: "approved", doctor: "Dr. Ama Mensah" },
  { id: "2", title: "Symptom Assessment - Chest Pain", type: "Triage", date: "2026-02-28", status: "reviewed", doctor: "AI Generated" },
  { id: "3", title: "Follow-up: Blood Pressure Management", type: "Follow-up", date: "2026-02-15", status: "approved", doctor: "Dr. Kwame Asante" },
];

const statusConfig = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
};

const MedicalReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Sign in to view reports</h1>
        <p className="text-muted-foreground mb-6">Access your medical reports and clinical documentation</p>
        <Button onClick={() => navigate("/auth?redirect=/reports")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Medical Reports</h1>
            <p className="text-muted-foreground">AI-generated clinical documentation</p>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {mockReports.map((report) => (
            <div key={report.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.doctor}</p>
                  </div>
                </div>
                <Badge className={statusConfig[report.status]}>
                  {report.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(report.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  <span>•</span>
                  <span>{report.type}</span>
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
          ))}
        </div>

        {/* Empty state hint */}
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
};

export default MedicalReports;
