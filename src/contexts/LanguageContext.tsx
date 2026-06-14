import React, { createContext, useContext, useEffect, useState } from "react";

export type LanguageCode = "en" | "tw" | "ga" | "ee" | "ha" | "fr" | "ar" | "yo" | "sw";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "tw", name: "Twi (Akan)", nativeName: "Twi" },
  { code: "ga", name: "Ga", nativeName: "Gã" },
  { code: "ee", name: "Ewe", nativeName: "Eʋegbe" },
  { code: "ha", name: "Hausa", nativeName: "Hausa" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
];

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentLanguage: Language;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const savedLanguage = localStorage.getItem("app-language");
    if (savedLanguage && SUPPORTED_LANGUAGES.some((lang) => lang.code === savedLanguage)) {
      return savedLanguage as LanguageCode;
    }
    return "en";
  });
  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    localStorage.setItem("app-language", language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
