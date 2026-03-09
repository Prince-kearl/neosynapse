import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Globe, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Admin Settings</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Appearance</h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4 space-y-4">
            <div className="flex items-center gap-3"><Moon className="w-5 h-5 text-muted-foreground" /><span className="font-medium">Theme</span></div>
            <ThemeToggle />
          </div>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Language</h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Globe className="w-5 h-5 text-muted-foreground" /><span className="font-medium">English (US)</span></div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </section>
        <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2" onClick={async () => { await signOut(); navigate("/"); }}>
          <LogOut className="w-4 h-4" />Log Out
        </Button>
      </div>
    </div>
  );
}
