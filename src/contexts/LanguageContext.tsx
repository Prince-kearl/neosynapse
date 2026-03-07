import React, { createContext, useContext, useState } from "react";

export type LanguageCode = "en" | "tw" | "ga" | "ee" | "ha";

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
];

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentLanguage: Language;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

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
