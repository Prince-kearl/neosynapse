import { useEffect } from "react";
import { useAppSettings } from "@/shared/hooks/useHealthcare";
import { applyAppThemeSettings } from "@/lib/ui-theme";

export function AppThemeSync() {
  const { data: appSettings } = useAppSettings();

  useEffect(() => {
    if (appSettings) {
      const settings = {
        app_color_mode: appSettings.app_color_mode,
        app_color_preset: appSettings.app_color_preset,
        app_custom_primary_hex: appSettings.app_custom_primary_hex,
        app_custom_accent_hex: appSettings.app_custom_accent_hex,
        app_custom_secondary_hex: appSettings.app_custom_secondary_hex,
        app_custom_ring_hex: appSettings.app_custom_ring_hex,
        app_ui_radius: appSettings.app_ui_radius,
        app_ui_scale: appSettings.app_ui_scale,
      };
      applyAppThemeSettings(settings);
    }
  }, [appSettings]);

  return null;
}
