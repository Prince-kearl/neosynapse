import { LanguageCode } from "@/contexts/LanguageContext";

const TRANSLATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-text`;

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  tw: "Twi",
  ga: "Ga",
  ee: "Ewe",
  ha: "Hausa",
  fr: "French",
  ar: "Arabic",
  yo: "Yoruba",
  sw: "Swahili",
};

export async function translateText(
  text: string,
  targetLanguage: LanguageCode,
  sourceLanguage?: string,
): Promise<string> {
  if (!text.trim()) return text;

  const response = await fetch(TRANSLATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      text,
      targetLanguage,
      sourceLanguage,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Translation service failed");
  }

  const body = await response.json();
  if (typeof body?.translated_text !== "string") {
    throw new Error("Unexpected translation response");
  }

  return body.translated_text;
}
