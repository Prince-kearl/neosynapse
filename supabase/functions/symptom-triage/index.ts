/**
 * symptom-triage: Structured AI triage assessment
 *
 * ENV VARS (Supabase secrets):
 *   GOOGLE_AI_API_KEY  – (required) Google AI / Gemini API key (primary provider)
 *   LOVABLE_API_KEY    – (optional) Legacy fallback via Lovable AI gateway
 *
 * Returns JSON: { urgency, summary, possible_conditions, recommended_action, questions, warning_signs }
 *
 * TODO: Adjust model name when upgrading Gemini versions
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
    console.warn("[symptom-triage] GOOGLE_AI_API_KEY not set – falling back to legacy Lovable AI gateway");
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

// --- Triage tool schema (OpenAI-compatible function calling) ------------------

const triageTool = {
  type: "function" as const,
  function: {
    name: "triage_assessment",
    description: "Provide structured triage assessment",
    parameters: {
      type: "object",
      properties: {
        urgency: { type: "string", enum: ["non-urgent", "needs-attention", "urgent", "emergency"] },
        summary: { type: "string" },
        possible_conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              likelihood: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["name", "likelihood"],
          },
        },
        recommended_action: { type: "string" },
        questions: { type: "array", items: { type: "string" } },
        warning_signs: { type: "array", items: { type: "string" } },
      },
      required: ["urgency", "summary", "possible_conditions", "recommended_action", "questions", "warning_signs"],
    },
  },
};

// --- Handler ------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, age, gender, language, medicalHistoryContext } = await req.json();
    const provider = resolveProvider();

    const systemPrompt = `You are Neo Synapse Triage Engine. Analyze patient symptoms and provide structured triage assessment.

RULES:
- You are NOT diagnosing. You are triaging for urgency.
- Always recommend professional medical consultation.
- Be thorough but concise.

Respond using this exact JSON structure via tool call:
- urgency: "non-urgent" | "needs-attention" | "urgent" | "emergency"
- summary: Brief assessment (1-2 sentences)
- possible_conditions: Array of up to 3 possible conditions with name and likelihood (high/medium/low)
- recommended_action: What the patient should do next
- questions: Array of up to 3 follow-up questions to refine assessment
- warning_signs: Array of red-flag symptoms to watch for`;

    const userMessage = `Patient Info: Age ${age || "unknown"}, Gender ${gender || "unknown"}
  ${medicalHistoryContext ? `Medical History: ${medicalHistoryContext}
  ` : ""}Reported Symptoms: ${symptoms}`;

    console.log(`[symptom-triage] Using provider: ${provider.tag}, model: ${provider.model}`);

    const response = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [triageTool],
        tool_choice: { type: "function", function: { name: "triage_assessment" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error(`[symptom-triage] ${provider.tag} error:`, response.status, t);
      return new Response(JSON.stringify({ error: "Triage service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: some models may return content instead of tool_calls
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("[symptom-triage] Could not parse content as JSON:", content);
      }
    }

    return new Response(JSON.stringify({ error: "No triage result" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[symptom-triage] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
