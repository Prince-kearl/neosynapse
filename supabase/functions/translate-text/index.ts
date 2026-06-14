/**
 * translate-text: AI-powered translation proxy for patient-facing content.
 *
 * ENV VARS (Supabase secrets):
 *   GOOGLE_AI_API_KEY  – (required) Google AI / Gemini API key (preferred)
 *   LOVABLE_API_KEY    – (optional) legacy fallback gateway key
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-client-runtime",
};

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  model: string;
  tag: string;
}

function resolveProvider(): ProviderConfig {
  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (googleKey) {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      headers: {
        Authorization: `Bearer ${googleKey}`,
        "Content-Type": "application/json",
      },
      model: "gemini-2.5-flash",
      tag: "google-ai",
    };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      model: "google/gemini-3-flash-preview",
      tag: "lovable-legacy",
    };
  }

  throw new Error("No AI provider configured. Set GOOGLE_AI_API_KEY or LOVABLE_API_KEY.");
}

const LANGUAGE_LABELS: Record<string, string> = {
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

function getTargetLanguageName(code: string) {
  return LANGUAGE_LABELS[code] || "English";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, sourceLanguage } = await req.json();

    if (typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const provider = resolveProvider();
    const targetName = getTargetLanguageName(targetLanguage);
    const sourceName = sourceLanguage ? getTargetLanguageName(sourceLanguage) : "the original language";

    const systemPrompt = `You are a professional medical translation assistant. Translate the user-provided content as accurately as possible while preserving medical terminology and meaning. Do not add any explanation, and return only the translated text.`;
    const userPrompt = `Translate the following text from ${sourceName} into ${targetName}.

${text}`;

    const response = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const data = await response.text();
      return new Response(JSON.stringify({ error: `Translation provider error: ${data}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    const result = await response.json();
    const message = result?.choices?.[0]?.message?.content || result?.choices?.[0]?.text || "";

    return new Response(JSON.stringify({ translated_text: String(message).trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
