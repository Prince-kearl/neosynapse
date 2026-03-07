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
    const { symptoms, age, gender, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
Reported Symptoms: ${symptoms}`;

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
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
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
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_assessment" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Triage error:", response.status, t);
      return new Response(JSON.stringify({ error: "Triage service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    return new Response(JSON.stringify({ error: "No triage result" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("triage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
