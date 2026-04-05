import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Globe, Shield, Bell, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "@/shared/hooks/useHealthcare";
import { profileService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { profile } = useUserRole();
  const { data: myProfile } = useMyProfile();

  const settings = ((myProfile?.settings_json as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const uiSettings = {
    systemAlerts: settings.system_alerts !== false,
    newRegistrations: settings.new_registrations === true,
    auditLoggingVisible: settings.audit_logging_visible !== false,
    dataRetentionDays: typeof settings.data_retention_days === "string" ? settings.data_retention_days : "90",
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await profileService.updateSettings(user.id, nextSettings);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    },
  });

  const persistSettings = (nextSettings: Record<string, unknown>, successMessage?: string) => {
    saveSettingsMutation.mutate(nextSettings, {
      onSuccess: () => {
        if (successMessage) {
          toast({ title: successMessage });
        }
      },
    });
  };

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
        <section id="notifications">
          <h2 className="font-display text-lg font-semibold mb-3">Notifications</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">System Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    {uiSettings.systemAlerts ? "Critical events and security alerts" : "System alerts are currently off"}
                  </p>
                </div>
              </div>
              <Switch
                checked={uiSettings.systemAlerts}
                disabled={saveSettingsMutation.isPending}
                onCheckedChange={(checked) =>
                  persistSettings(
                    { ...settings, system_alerts: checked },
                    checked ? "System alerts enabled" : "System alerts disabled"
                  )
                }
              />
            </div>
            <div className="border-t border-border flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">New Registrations</p>
                  <p className="text-sm text-muted-foreground">Notify when new users sign up</p>
                </div>
              </div>
              <Switch
                checked={uiSettings.newRegistrations}
                disabled={saveSettingsMutation.isPending}
                onCheckedChange={(checked) =>
                  persistSettings(
                    { ...settings, new_registrations: checked },
                    checked ? "Registration alerts enabled" : "Registration alerts disabled"
                  )
                }
              />
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
              <Switch
                checked={uiSettings.auditLoggingVisible}
                disabled={saveSettingsMutation.isPending}
                onCheckedChange={(checked) =>
                  persistSettings(
                    { ...settings, audit_logging_visible: checked },
                    checked ? "Audit logging details visible" : "Audit logging details hidden"
                  )
                }
              />
            </div>
            <div className="border-t border-border flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Data Retention</p>
                  <p className="text-sm text-muted-foreground">Audit logs retained for {uiSettings.dataRetentionDays} days</p>
                </div>
              </div>
              <Select
                value={uiSettings.dataRetentionDays}
                onValueChange={(value) =>
                  persistSettings(
                    { ...settings, data_retention_days: value },
                    `Data retention set to ${value} days`
                  )
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
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
                <span className="font-medium">App Language</span>
              </div>
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value as typeof language);
                  toast({ title: "Language updated" });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
