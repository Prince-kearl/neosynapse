import { useEffect } from "react";
import { useTheme } from "next-themes";
import { SUPPORTED_LANGUAGES, useLanguage, type LanguageCode } from "@/contexts/LanguageContext";
import { useProfessionalSettings } from "@/shared/hooks/useProfessionalSettings";

export function ProfessionalSettingsRuntime() {
  const { settings } = useProfessionalSettings();
  const { setTheme, theme } = useTheme();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (!settings.theme) return;
    if (!["system", "light", "dark"].includes(settings.theme)) return;
    if (theme !== settings.theme) {
      setTheme(settings.theme);
    }
  }, [setTheme, settings.theme, theme]);

  useEffect(() => {
    if (!settings.language) return;
    if (!SUPPORTED_LANGUAGES.some((item) => item.code === settings.language)) return;
    if (language !== settings.language) {
      setLanguage(settings.language as LanguageCode);
    }
  }, [language, setLanguage, settings.language]);

  return null;
}
