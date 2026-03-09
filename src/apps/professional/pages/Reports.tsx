import { FileCheck, Download, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// TODO: Fetch real reports from database
const mockReports = [
  { id: "1", patientName: "Ama Mensah", type: "Consultation Summary", date: "2026-03-08T14:00:00Z", status: "approved" },
  { id: "2", patientName: "Kofi Asante", type: "Lab Order", date: "2026-03-07T10:00:00Z", status: "pending" },
  { id: "3", patientName: "Efua Owusu", type: "Prescription", date: "2026-03-05T09:00:00Z", status: "approved" },
];

export default function ProfessionalReports() {
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Reports</h1>
          <p className="text-muted-foreground">Finalized clinical documents and reports</p>
        </div>

        <div className="space-y-4">
          {mockReports.map((report) => (
            <div key={report.id} className="bg-card rounded-2xl p-4 shadow-food-card border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{report.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.type} • {new Date(report.date).toLocaleDateString("en-GB", { 
                        day: "numeric", month: "short"
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={
                    report.status === "approved" ? "border-green-500/50 text-green-500" : "border-yellow-500/50 text-yellow-500"
                  }>
                    {report.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
