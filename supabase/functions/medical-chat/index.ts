import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const languageInstruction = language && language !== "en"
      ? `Respond in ${language === "tw" ? "Twi (Akan)" : language === "ga" ? "Ga" : language === "ee" ? "Ewe" : language === "ha" ? "Hausa" : "English"} when the user writes in that language or requests it. Otherwise respond in English.`
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("medical-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
