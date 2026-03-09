import { FileCode } from "lucide-react";

export default function AdminTemplates() {
  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Templates</h1>
          <p className="text-muted-foreground">Manage clinical note templates and report formats</p>
        </div>
        <div className="bg-card rounded-2xl p-8 shadow-food-card text-center border border-border">
          <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Template management for clinical notes, prescriptions, and report formats will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
