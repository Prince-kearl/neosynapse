import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Globe, Moon, Shield, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { professionalProfileService } from "@/shared/services/healthcare";
import { usePushNotifications } from "@/legacy/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

export default function ProfessionalSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { profile } = useUserRole();
  const { isSupported, permission, requestPermission } = usePushNotifications();

  const { data: proProfile } = useQuery({
    queryKey: ["pro-profile", user?.id],
    queryFn: async () => {
      const { data } = await professionalProfileService.get(user!.id);
      return data;
    },
    enabled: !!user,
  });

  const settings = ((proProfile?.settings_json as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const patientAlertsEnabled = settings.patient_alerts !== false;
  const activityLoggingVisible = settings.activity_logging_visible !== false;

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await professionalProfileService.updateSettings(user.id, nextSettings);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pro-profile", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    },
  });

  const persistSettings = (nextSettings: Record<string, unknown>, successTitle: string) => {
    saveSettingsMutation.mutate(nextSettings, {
      onSuccess: () => {
        toast({ title: successTitle });
      },
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handlePatientAlertsToggle = async (checked: boolean) => {
    if (checked && isSupported && permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Notifications not enabled",
          description: "Allow browser notifications to receive urgent patient alerts.",
          variant: "destructive",
        });
        return;
      }
    }

    persistSettings(
      {
        ...settings,
        patient_alerts: checked,
      },
      checked ? "Patient alerts enabled" : "Patient alerts disabled"
    );
  };

  const handleActivityLoggingInfoToggle = (checked: boolean) => {
    persistSettings(
      {
        ...settings,
        activity_logging_visible: checked,
      },
      checked ? "Compliance details visible" : "Compliance details hidden"
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Professional Profile */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Professional Profile</h2>
          <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{profile?.full_name || profile?.display_name || "Doctor"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            {proProfile && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Specialty</p>
                  <p className="text-sm font-medium">{proProfile.specialty || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">License</p>
                  <p className="text-sm font-medium">{proProfile.license_number || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profession</p>
                  <p className="text-sm font-medium">{proProfile.profession_type || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verification</p>
                  <Badge variant="outline" className={
                    proProfile.verification_status === "verified"
                      ? "border-emerald-500/50 text-emerald-500"
                      : "border-yellow-500/50 text-yellow-500"
                  }>
                    {proProfile.verification_status}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Appearance</h2>
          <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Theme</span>
              </div>
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
                  <p className="font-medium">Patient Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    {patientAlertsEnabled ? "High-urgency triage notifications enabled" : "Patient alerts are off"}
                  </p>
                </div>
              </div>
              <Switch checked={patientAlertsEnabled} onCheckedChange={handlePatientAlertsToggle} disabled={saveSettingsMutation.isPending} />
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Privacy & Compliance</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Activity Logging</p>
                  <p className="text-sm text-muted-foreground">Clinical actions logged for audit compliance</p>
                </div>
              </div>
              <Switch checked={activityLoggingVisible} onCheckedChange={handleActivityLoggingInfoToggle} disabled={saveSettingsMutation.isPending} />
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
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
