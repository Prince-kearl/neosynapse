import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Globe, Shield, Bell, Database, LogOut, Palette, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES, useLanguage, type LanguageCode } from "@/contexts/LanguageContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSettings } from "@/shared/hooks/useHealthcare";
import { useAdminSettings } from "@/shared/hooks/useAdminSettings";
import { appSettingsService } from "@/shared/services/healthcare";
import { toast } from "@/hooks/use-toast";
import { APP_COLOR_PRESETS, DEFAULT_CUSTOM_PALETTE, type AppColorPresetKey, type AppThemeSettings, applyAppThemeSettings } from "@/lib/ui-theme";

export default function AdminSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { profile } = useUserRole();
  const { settings: adminSettings, saveSettingsMutation } = useAdminSettings();
  const { data: appSettings } = useAppSettings();
  const [customPalette, setCustomPalette] = useState({
    primary: DEFAULT_CUSTOM_PALETTE.primary,
    accent: DEFAULT_CUSTOM_PALETTE.accent,
    secondary: DEFAULT_CUSTOM_PALETTE.secondary,
    ring: DEFAULT_CUSTOM_PALETTE.ring,
  });

  const uiSettings = {
    systemAlerts: adminSettings.systemAlerts,
    newRegistrations: adminSettings.newRegistrations,
    auditLoggingVisible: adminSettings.auditLoggingVisible,
    dataRetentionDays: adminSettings.dataRetentionDays,
    colorMode: appSettings?.app_color_mode === "custom" ? "custom" : "preset",
    colorPreset: (typeof appSettings?.app_color_preset === "string" ? appSettings.app_color_preset : "medical_green") as AppColorPresetKey,
    uiRadius: typeof appSettings?.app_ui_radius === "string" ? appSettings.app_ui_radius : "0.75rem",
    uiScale: typeof appSettings?.app_ui_scale === "string" ? appSettings.app_ui_scale : "1",
  };

  const themePreviewSettings = {
    app_color_mode: uiSettings.colorMode,
    app_color_preset: uiSettings.colorPreset,
    app_custom_primary_hex: customPalette.primary,
    app_custom_accent_hex: customPalette.accent,
    app_custom_secondary_hex: customPalette.secondary,
    app_custom_ring_hex: customPalette.ring,
    app_ui_radius: uiSettings.uiRadius,
    app_ui_scale: uiSettings.uiScale,
  } satisfies AppThemeSettings;

  useEffect(() => {
    setCustomPalette({
      primary: typeof appSettings?.app_custom_primary_hex === "string" ? appSettings.app_custom_primary_hex : DEFAULT_CUSTOM_PALETTE.primary,
      accent: typeof appSettings?.app_custom_accent_hex === "string" ? appSettings.app_custom_accent_hex : DEFAULT_CUSTOM_PALETTE.accent,
      secondary: typeof appSettings?.app_custom_secondary_hex === "string" ? appSettings.app_custom_secondary_hex : DEFAULT_CUSTOM_PALETTE.secondary,
      ring: typeof appSettings?.app_custom_ring_hex === "string" ? appSettings.app_custom_ring_hex : DEFAULT_CUSTOM_PALETTE.ring,
    });
  }, [appSettings]);

  const saveAppSettingsMutation = useMutation({
    mutationFn: async (nextAppSettings: Record<string, unknown>) => {
      const { error } = await appSettingsService.update({
        ...nextAppSettings,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (error) => {
      toast({ title: "Failed to save app settings", description: error.message, variant: "destructive" });
    },
  });

  const persistAppSettings = (nextSettings: Record<string, unknown>, successMessage?: string) => {
    saveAppSettingsMutation.mutate(nextSettings, {
      onSuccess: () => {
        if (successMessage) {
          toast({ title: successMessage });
        }
      },
    });
  };

  const persistSettings = (nextSettings: Record<string, unknown>, successMessage?: string) => {
    saveSettingsMutation.mutate(nextSettings, {
      onSuccess: () => {
        if (successMessage) {
          toast({ title: successMessage });
        }
      },
      onError: (error) => {
        toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleThemeChange = (theme: string) => {
    persistSettings({ ...adminSettings.raw, theme }, `Theme set to ${theme}`);
  };

  const handleLanguageChange = (value: LanguageCode) => {
    setLanguage(value);
    persistSettings({ ...adminSettings.raw, language: value }, "Language updated");
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
            <ThemeToggle onThemeChange={handleThemeChange} />

            <div className="pt-2 border-t border-border/70 space-y-3">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Brand Color</span>
              </div>
              <p className="text-xs text-muted-foreground">Choose a tenant-wide palette for dashboards, accents, carousel highlights, and active states.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {(Object.entries(APP_COLOR_PRESETS) as [AppColorPresetKey, (typeof APP_COLOR_PRESETS)[AppColorPresetKey]][]).map(([key, preset]) => {
                  const active = uiSettings.colorPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                        active ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                      onClick={() => {
                        const nextAppSettings = { ...themePreviewSettings, app_color_mode: "preset", app_color_preset: key };
                        applyAppThemeSettings(nextAppSettings);
                        persistAppSettings(nextAppSettings, `${preset.label} palette applied`);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{preset.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {active ? "Current tenant palette" : "Primary, accent, and depth tones"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {active ? "Active" : "Preset"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="h-8 flex-1 rounded-xl" style={{ backgroundColor: `hsl(${preset.primary})` }} />
                        <span className="h-8 flex-1 rounded-xl" style={{ backgroundColor: `hsl(${preset.accent})` }} />
                        <span className="h-8 flex-1 rounded-xl" style={{ backgroundColor: `hsl(${preset.secondary})` }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Custom Palette</p>
                    <p className="text-xs text-muted-foreground">Define your own tenant-wide colors and apply them across the app.</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      uiSettings.colorMode === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {uiSettings.colorMode === "custom" ? "Active" : "Custom"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    ["primary", "Primary"],
                    ["accent", "Accent"],
                    ["secondary", "Secondary"],
                    ["ring", "Ring"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="rounded-xl border border-border bg-card p-3">
                      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customPalette[key]}
                          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                          onChange={(event) => {
                            const nextPalette = { ...customPalette, [key]: event.target.value };
                            setCustomPalette(nextPalette);
                            applyAppThemeSettings({
                              ...themePreviewSettings,
                              app_color_mode: "custom",
                              app_custom_primary_hex: nextPalette.primary,
                              app_custom_accent_hex: nextPalette.accent,
                              app_custom_secondary_hex: nextPalette.secondary,
                              app_custom_ring_hex: nextPalette.ring,
                            });
                          }}
                        />
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono uppercase text-foreground">
                          {customPalette[key]}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-10 flex-1 rounded-xl" style={{ backgroundColor: customPalette.primary }} />
                  <span className="h-10 flex-1 rounded-xl" style={{ backgroundColor: customPalette.accent }} />
                  <span className="h-10 flex-1 rounded-xl" style={{ backgroundColor: customPalette.secondary }} />
                  <span className="h-10 flex-1 rounded-xl" style={{ backgroundColor: customPalette.ring }} />
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={saveAppSettingsMutation.isPending}
                  onClick={() => {
                    const nextAppSettings = {
                      ...themePreviewSettings,
                      app_color_mode: "custom",
                      app_custom_primary_hex: customPalette.primary,
                      app_custom_accent_hex: customPalette.accent,
                      app_custom_secondary_hex: customPalette.secondary,
                      app_custom_ring_hex: customPalette.ring,
                    };
                    applyAppThemeSettings(nextAppSettings);
                    persistAppSettings(nextAppSettings, "Custom palette applied");
                  }}
                >
                  Apply Custom Palette
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/70 space-y-3">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">UI Density</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Corner Radius</p>
                  <Select
                    value={uiSettings.uiRadius}
                    onValueChange={(value) => {
                      const nextAppSettings = { app_ui_radius: value };
                      applyAppThemeSettings(nextAppSettings);
                      persistAppSettings(nextAppSettings, "Corner radius updated");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5rem">Compact</SelectItem>
                      <SelectItem value="0.75rem">Default</SelectItem>
                      <SelectItem value="1rem">Soft</SelectItem>
                      <SelectItem value="1.25rem">Rounded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Text Scale</p>
                  <Select
                    value={uiSettings.uiScale}
                    onValueChange={(value) => {
                      const nextAppSettings = { app_ui_scale: value };
                      applyAppThemeSettings(nextAppSettings);
                      persistAppSettings(nextAppSettings, "Text scale updated");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.95">Compact</SelectItem>
                      <SelectItem value="1">Default</SelectItem>
                      <SelectItem value="1.05">Comfortable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
                    { ...adminSettings.raw, system_alerts: checked },
                    checked ? "System alerts enabled" : "System alerts disabled"
                  )
                }
              />
            </div>
            <div className="border-t border-border flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    { ...adminSettings.raw, new_registrations: checked },
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
                    { ...adminSettings.raw, audit_logging_visible: checked },
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
                    { ...adminSettings.raw, data_retention_days: value },
                    `Data retention set to ${value} days`
                  )
                }
              >
                <SelectTrigger className="w-full sm:w-[120px]">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">App Language</span>
              </div>
              <Select
                value={language}
                onValueChange={(value) => handleLanguageChange(value as LanguageCode)}
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
