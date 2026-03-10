/**
 * medical-chat: Streaming AI medical assistant
 *
 * ENV VARS (Supabase secrets):
 *   GOOGLE_AI_API_KEY  – (required) Google AI / Gemini API key (primary provider)
 *   LOVABLE_API_KEY    – (optional) Legacy fallback via Lovable AI gateway
 *
 * TODO: Adjust model name when upgrading Gemini versions (e.g. gemini-2.5-flash)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Provider configuration ---------------------------------------------------

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  model: string;
  tag: string; // for logging
}

function resolveProvider(): ProviderConfig {
  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (googleKey) {
    return {
      // Google AI Gemini – OpenAI-compatible endpoint
      url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      headers: {
        Authorization: `Bearer ${googleKey}`,
        "Content-Type": "application/json",
      },
      // TODO: Update model as newer Gemini versions become available
      model: "gemini-2.5-flash",
      tag: "google-ai",
    };
  }

  // Legacy fallback – Lovable AI gateway (remove once fully migrated)
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    console.warn("[medical-chat] GOOGLE_AI_API_KEY not set – falling back to legacy Lovable AI gateway");
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

  throw new Error("No AI provider configured. Set GOOGLE_AI_API_KEY (preferred) or LOVABLE_API_KEY.");
}

// --- Handler ------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    const provider = resolveProvider();

    const languageInstruction =
      language && language !== "en"
        ? `Respond in ${
            language === "tw" ? "Twi (Akan)" :
            language === "ga" ? "Ga" :
            language === "ee" ? "Ewe" :
            language === "ha" ? "Hausa" : "English"
          } when the user writes in that language or requests it. Otherwise respond in English.`
        : "";

    const systemPrompt = `You are Neo Synapse, an AI-powered medical assistant. You provide verified, evidence-based health guidance.

IMPORTANT RULES:
- You are NOT a doctor. Always recommend consulting a healthcare professional for diagnosis and treatment.
- Never provide specific drug dosages or prescriptions.
- For emergencies, immediately advise calling emergency services.
- Be empathetic, clear, and concise.
- When analyzing symptoms, categorize urgency: Non-urgent, Needs Attention, or Urgent.
- You can analyze medical images (X-rays, skin conditions, etc.) but always note limitations.
- Support triage by asking relevant follow-up questions about symptoms.
${languageInstruction}

You support these capabilities:
1. Health Q&A - Answer medical questions with verified information
2. Symptom Analysis - Assess symptoms and suggest urgency level
3. Medical Image Analysis - Analyze uploaded medical images (with caveats)
4. Pre-consultation Prep - Help patients prepare for doctor visits
5. Post-consultation Summary - Help understand medical reports`;

    console.log(`[medical-chat] Using provider: ${provider.tag}, model: ${provider.model}`);

    const response = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error(`[medical-chat] ${provider.tag} error:`, response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream SSE response directly to client (same shape expected by frontend)
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[medical-chat] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
