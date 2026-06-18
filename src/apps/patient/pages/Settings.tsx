// Patient Settings - wrapped from existing
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Bell, Globe, Moon, Smartphone, Shield, Eye, Trash2, 
  BellRing, FileText, HeartPulse, Sparkles, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { usePushNotifications } from "@/legacy/hooks/usePushNotifications";
import { ensureNativePushRegistration, isNativePushSupported } from "@/mobile/pushNotifications";
import {
  getNotificationCapabilityDescription,
  getNotificationCapabilityLabel,
  isNativeRemotePushConfigured,
} from "@/mobile/notificationFallbacks";
import { useMedicalHistory, useMedicalHistoryFiles, useMyConsents, useMyReports, usePatientProfile } from "@/shared/hooks/useHealthcare";
import { useAIConsentCheck } from "@/shared/hooks/useAIConsentCheck";
import { patientProfileService, consentService } from "@/shared/services/healthcare";
import { getPatientProfileMeta, mergePatientProfileMeta, type PatientProfileMeta } from "@/shared/lib/patientSettings";
import { toast } from "@/hooks/use-toast";

export default function PatientSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { data: patientProfile } = usePatientProfile();
  const { data: medicalHistory } = useMedicalHistory();
  const { data: medicalHistoryFiles = [] } = useMedicalHistoryFiles();
  const { data: reports = [] } = useMyReports();
  const { data: consents = [] } = useMyConsents();
  const { data: aiConsent } = useAIConsentCheck();
  const { isSupported, isEnabled, permission, requestPermission } = usePushNotifications();

  const revokeAiConsentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !aiConsent?.id) throw new Error("No AI consent to revoke");
      const { error } = await consentService.revoke(aiConsent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-consent", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["consents", user?.id] });
      toast({ title: "AI consent revoked", description: "You can re-grant consent from the AI Assistant." });
    },
    onError: (error) => {
      toast({ title: "Failed to revoke consent", description: error.message, variant: "destructive" });
    },
  });

  const aiConsentDate = aiConsent?.created_at
    ? new Date(aiConsent.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleRevokeAiConsent = async () => {
    if (!aiConsent?.id) return;
    const confirmed = window.confirm("Revoke AI medical assistant consent?");
    if (!confirmed) return;
    await revokeAiConsentMutation.mutateAsync();
  };

  const handleOpenAiAssistant = () => {
    navigate("/patient/ai-assistant");
  };

  const profileMeta = getPatientProfileMeta(patientProfile?.insurance_info);
  const notificationSettings = profileMeta.notification_settings;
  const privacySecuritySettings = profileMeta.privacy_security_settings;
  const appSettings = profileMeta.settings;

  const updateSettingsMutation = useMutation({
    mutationFn: async (patch: Partial<typeof profileMeta>) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await patientProfileService.upsert(user.id, {
        insurance_info: mergePatientProfileMeta(patientProfile?.insurance_info, patch),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
    onError: (error) => {
      toast({ title: "Failed to save setting", description: error.message, variant: "destructive" });
    },
  });

  const persistProfileMeta = (patch: Partial<PatientProfileMeta>, successTitle: string) => {
    updateSettingsMutation.mutate(
      patch,
      {
        onSuccess: () => {
          toast({ title: successTitle });
        },
      }
    );
  };

  const browserNotificationsEnabled =
    notificationSettings.browser_notifications === null
      ? isEnabled
      : notificationSettings.browser_notifications;
  const notificationChannelLabel = getNotificationCapabilityLabel();
  const notificationChannelDescription = getNotificationCapabilityDescription(isSupported, permission);
  const smsNotificationsEnabled = notificationSettings.sms_notifications;
  const healthDataSyncEnabled = appSettings.health_data_sync;
  const profileVisibilityShared = privacySecuritySettings.profile_visibility !== "private";
  const anonymousAnalyticsEnabled = appSettings.anonymous_analytics;

  const handlePushToggle = async (checked: boolean) => {
    if (!isSupported) return;
    const fallbackOnly = !isNativeRemotePushConfigured() && typeof Notification === "undefined";
    const enabledTitle = fallbackOnly ? "In-app notifications enabled" : "Notifications enabled";
    const disabledTitle = fallbackOnly ? "In-app notifications disabled" : "Browser notifications disabled";

    if (checked && permission !== "granted") {
      const granted = await requestPermission();
      if (granted) {
        persistProfileMeta(
          {
            notification_settings: {
              ...notificationSettings,
              browser_notifications: true,
            },
          },
          enabledTitle
        );
        toast({
          title: enabledTitle,
          description: fallbackOnly
            ? "You will see alerts while Neo Synapse is open."
            : "You'll receive health alerts and appointment reminders.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
      return;
    }

    persistProfileMeta(
      {
        notification_settings: {
          ...notificationSettings,
          browser_notifications: checked,
        },
      },
      checked ? enabledTitle : disabledTitle
    );

    if (checked && isNativePushSupported()) {
      await ensureNativePushRegistration(user?.id);
    }
  };

  const handleSmsToggle = (checked: boolean) => {
    persistProfileMeta(
      {
        notification_settings: {
          ...notificationSettings,
          sms_notifications: checked,
        },
      },
      checked ? "SMS notifications enabled" : "SMS notifications disabled"
    );
  };

  const handleHealthDataSyncToggle = (checked: boolean) => {
    persistProfileMeta(
      {
        settings: {
          ...appSettings,
          health_data_sync: checked,
        },
      },
      checked ? "Health data sync enabled" : "Health data sync disabled"
    );
  };

  const handleVisibilityToggle = (checked: boolean) => {
    persistProfileMeta(
      {
        privacy_security_settings: {
          ...privacySecuritySettings,
          profile_visibility: checked ? "care_team" : "private",
        },
      },
      checked ? "Profile visibility set to care team" : "Profile visibility set to private"
    );
  };

  const handleAnalyticsToggle = (checked: boolean) => {
    persistProfileMeta(
      {
        settings: {
          ...appSettings,
          anonymous_analytics: checked,
        },
      },
      checked ? "Anonymous analytics enabled" : "Anonymous analytics disabled"
    );
  };

  const handleExportRecords = () => {
    if (!user) return;

    const exportPayload = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile: {
        email: user.email,
        patient_profile: patientProfile || null,
      },
      medical_reports: reports,
      medical_history: medicalHistory || null,
      medical_history_files: medicalHistoryFiles,
      patient_settings: profileMeta,
      consents,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `neosynapse-medical-records-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast({ title: "Export ready", description: "Your medical records were downloaded as JSON." });
  };

  const handleDeleteRequest = () => {
    const subject = encodeURIComponent("Account deletion request");
    const body = encodeURIComponent(
      `Please delete my Neo Synapse account.\n\nUser email: ${user?.email || ""}\nUser ID: ${user?.id || ""}\nRequest date: ${new Date().toISOString()}`
    );
    window.location.href = `mailto:support@neosynapse.health?subject=${subject}&body=${body}`;
    toast({ title: "Deletion request opened", description: "Your mail app has been opened with a pre-filled request." });
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Appearance */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Appearance</h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Notifications</h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{notificationChannelLabel}</p>
                  <p className="text-sm text-muted-foreground">
                    {notificationChannelDescription}
                  </p>
                </div>
              </div>
              <Switch 
                checked={browserNotificationsEnabled}
                onCheckedChange={handlePushToggle}
                disabled={!isSupported || permission === "denied" || updateSettingsMutation.isPending}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Critical health alerts only</p>
                </div>
              </div>
              <Switch checked={smsNotificationsEnabled} onCheckedChange={handleSmsToggle} disabled={updateSettingsMutation.isPending} />
            </div>
          </div>
        </section>

        {/* Health Data */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Health Data</h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <HeartPulse className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Health Data Sync</p>
                  <p className="text-sm text-muted-foreground">Sync vitals from wearable devices</p>
                </div>
              </div>
              <Switch checked={healthDataSyncEnabled} onCheckedChange={handleHealthDataSyncToggle} disabled={updateSettingsMutation.isPending} />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Export Medical Records</p>
                  <p className="text-sm text-muted-foreground">Download your health data</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportRecords}>Export</Button>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Privacy</h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Profile Visibility</p>
                  <p className="text-sm text-muted-foreground">Share profile with healthcare providers</p>
                </div>
              </div>
              <Switch checked={profileVisibilityShared} onCheckedChange={handleVisibilityToggle} disabled={updateSettingsMutation.isPending} />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Anonymous Analytics</p>
                  <p className="text-sm text-muted-foreground">Help improve Neo Synapse</p>
                </div>
              </div>
              <Switch checked={anonymousAnalyticsEnabled} onCheckedChange={handleAnalyticsToggle} disabled={updateSettingsMutation.isPending} />
            </div>
            <Separator />
            <Link to="/privacy" className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Privacy Policy</p>
                  <p className="text-sm text-muted-foreground">How Neo Synapse handles health data</p>
                </div>
              </div>
              <span className="text-sm text-primary">View</span>
            </Link>
          </div>
        </section>

        {/* AI Medical Consent */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">AI Medical Consent</h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">AI Medical Assistant</p>
                  <p className="text-sm text-muted-foreground">
                    {aiConsent
                      ? `Consent granted on ${aiConsentDate}.`
                      : "Consent not yet granted for AI medical advice."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aiConsent ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRevokeAiConsent}
                    disabled={revokeAiConsentMutation.isPending}
                  >
                    {revokeAiConsentMutation.isPending ? "Revoking..." : "Revoke consent"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleOpenAiAssistant}>
                    Grant consent
                  </Button>
                )}
              </div>
            </div>
            <Separator />
            <div className="p-4 text-sm text-muted-foreground">
              <p>AI conversations require explicit medical consent before you can use the assistant.</p>
              <p className="mt-2">
                If you revoke consent, the AI Medical Assistant will require consent again before it can be used.
              </p>
            </div>
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Language</h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4">
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
                <SelectTrigger className="w-full sm:w-[180px]">
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

        {/* Danger Zone */}
        <section>
          <h2 className="font-display text-lg font-semibold text-destructive mb-3">Danger Zone</h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently remove all your health data</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto">Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be auto-completed from the app yet. Continue to open a pre-filled deletion request to support.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRequest}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
