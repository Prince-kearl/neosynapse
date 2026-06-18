import { useEffect } from "react";
import { useTheme } from "next-themes";
import { SUPPORTED_LANGUAGES, useLanguage, type LanguageCode } from "@/contexts/LanguageContext";
import { useAdminSettings } from "@/shared/hooks/useAdminSettings";

export function AdminSettingsRuntime() {
  const { setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { settings } = useAdminSettings();

  useEffect(() => {
    if (settings.theme && ["system", "light", "dark"].includes(settings.theme)) {
      setTheme(settings.theme);
    }
  }, [setTheme, settings.theme]);

  useEffect(() => {
    const savedLanguage = settings.language;
    if (
      savedLanguage &&
      savedLanguage !== language &&
      SUPPORTED_LANGUAGES.some((supported) => supported.code === savedLanguage)
    ) {
      setLanguage(savedLanguage as LanguageCode);
    }
  }, [language, setLanguage, settings.language]);

  return null;
}
