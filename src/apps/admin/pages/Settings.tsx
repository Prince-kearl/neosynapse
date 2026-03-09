import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Globe, Shield, Bell, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useUserRole();

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">Admin Settings</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Account */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Account</h2>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-semibold">
                {(profile?.full_name || profile?.display_name || "A").charAt(0)}
              </div>
              <div>
                <p className="font-medium">{profile?.full_name || profile?.display_name || "Admin"}</p>
                <p className="text-sm text-muted-foreground">{user?.email} • Admin</p>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Appearance</h2>
          <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Theme</span>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Notifications</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">System Alerts</p>
                  <p className="text-sm text-muted-foreground">Critical events and security alerts</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="border-t border-border flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">New Registrations</p>
                  <p className="text-sm text-muted-foreground">Notify when new users sign up</p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        {/* Security */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Security & Compliance</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Audit Logging</p>
                  <p className="text-sm text-muted-foreground">All admin actions are logged for compliance</p>
                </div>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="border-t border-border flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Data Retention</p>
                  <p className="text-sm text-muted-foreground">Audit logs retained for 90 days</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Language</h2>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">English (US)</span>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </section>

        {/* Log Out */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
          onClick={async () => { await signOut(); navigate("/"); }}
        >
          <LogOut className="w-4 h-4" /> Log Out
        </Button>
      </div>
    </div>
  );
}
