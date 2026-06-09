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

const templatedReasonPatterns = [
  /this is a leading possibility/i,
  /this is a plausible possibility/i,
  /this is a possible possibility/i,
  /based on the symptoms provided/i,
  /more information is needed/i,
  /symptoms provided/i,
  /a leading possibility/i,
  /a plausible possibility/i,
  /due to the symptoms provided/i,
  /in the absence of more information/i,
  /cannot be ruled out without a clinical exam/i,
  /matches some of your symptoms/i,
  /is a plausible explanation/i,
];

function isTemplatedReason(reason: string): boolean {
  return templatedReasonPatterns.some((pattern) => pattern.test(reason));
}

function shouldRewriteReasons(result: unknown): result is { possible_conditions: Array<{ name?: string; likelihood?: string; reason?: string }> } {
  return (
    typeof result === "object" && result !== null &&
    Array.isArray((result as any).possible_conditions) &&
    (result as any).possible_conditions.every((condition: any) =>
      typeof condition.name === "string" && typeof condition.likelihood === "string"
    )
  );
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const curlyStart = text.indexOf("{");
    const curlyEnd = text.lastIndexOf("}");
    if (curlyStart !== -1 && curlyEnd !== -1 && curlyEnd > curlyStart) {
      try {
        return JSON.parse(text.slice(curlyStart, curlyEnd + 1));
      } catch {
        // continue
      }
    }

    const bracketStart = text.indexOf("[");
    const bracketEnd = text.lastIndexOf("]");
    if (bracketStart !== -1 && bracketEnd !== -1 && bracketEnd > bracketStart) {
      try {
        return JSON.parse(text.slice(bracketStart, bracketEnd + 1));
      } catch {
        // continue
      }
    }
  }

  return null;
}

async function rewriteGenericReasons(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  previousResult: unknown,
) {
  const rewritePrompt = `${systemPrompt}

REWRITE PASS:
- Rewrite only the reason field for each item in possible_conditions.
- Keep urgency, summary, recommended_action, questions, and warning_signs unchanged.
- Replace placeholder or generic reason text with symptom-specific clinical reasoning.
- Do not use general phrases such as "This is a leading possibility based on the symptoms provided." or "This is a plausible possibility, but more information is needed."
- Each reason must explicitly reference the reported symptoms and explain why the condition is being considered.
- Each reason should explain why the assigned likelihood is high, medium, or low.
- Do not repeat the same wording across multiple conditions.
- Reasons must read like a clinician explaining the symptoms to a patient.
- If the previous result contains all condition names and likelihoods, preserve them exactly.
- Return the same JSON structure using the triage_assessment function call only.`;

  const response = await fetch(provider.url, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: rewritePrompt },
        { role: "user", content: `${userMessage}

Previous assessment result:
${JSON.stringify(previousResult, null, 2)}

Please return the same object with rewritten reasons.` },
      ],
      tools: [triageTool],
      tool_choice: { type: "function", function: { name: "triage_assessment" } },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    const parsed = tryParseJson(toolCall.function.arguments);
    if (parsed !== null) return parsed;
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const parsed = tryParseJson(content);
    if (parsed !== null) return parsed;
  }

  return null;
}

async function ensureConditionReasons(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  result: unknown,
) {
  if (
    shouldRewriteReasons(result) &&
    (result as any).possible_conditions.some((condition: any) =>
      typeof condition.reason !== "string" ||
      condition.reason.trim().length < 30 ||
      isTemplatedReason(condition.reason)
    )
  ) {
    const rewritten = await rewriteGenericReasons(provider, systemPrompt, userMessage, result);
    if (rewritten && shouldRewriteReasons(rewritten)) {
      return rewritten;
    }
  }

  return result;
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
              reason: { type: "string", minLength: 20 },
            },
            required: ["name", "likelihood", "reason"],
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

    const systemPrompt = `

You are Neo Synapse Triage Engine.

Your role is to perform symptom triage and generate evidence-based clinical hypotheses.

IMPORTANT:

- You are NOT diagnosing.
- You are NOT confirming any disease.
- You are generating possible explanations for the patient’s symptoms.
- Your reasoning must be transparent, symptom-specific, and clinically meaningful.

# **=================================================================**
** ****POSSIBLE CONDITIONS REQUIREMENTS**
For EVERY condition you suggest, you MUST provide:

1. Condition name
2. Likelihood (high, medium, low)
3. Detailed clinical reasoning

The reasoning is the most important part.

The reasoning must:

- Explain WHY the condition was suggested.
- Reference the patient’s actual reported symptoms.
- Connect symptoms to known clinical features of the condition.
- Explain which symptoms strongly support the condition.
- Explain why the condition is ranked as Likely, Possible, or Less Likely.
- Read like a doctor’s explanation to a patient.
- Be unique for every condition.
- Be dynamically generated from the patient’s symptoms.

DO NOT use generic explanations.

NEVER write things like:

❌ “This is a leading possibility based on the symptoms provided.”

❌ “This is a plausible possibility, but more information is needed.”

❌ “This condition matches some of your symptoms.”

❌ “Based on the information available.”

These explanations are prohibited.

# **=================================================================**
** ****REASONING STYLE**
Good reasoning should look like:

“The combination of fever, sore throat, nasal congestion, fatigue, and body aches is commonly seen in viral upper respiratory infections such as influenza or the common cold. Because several of your reported symptoms fit this pattern and there are no strong symptoms suggesting a bacterial infection, a viral infection is considered one of the strongest explanations.”

or

“Persistent cough, fever, chest discomfort, and shortness of breath are symptoms frequently associated with lower respiratory tract infections such as bronchitis or pneumonia. The presence of both respiratory symptoms and systemic symptoms increases the likelihood of this condition compared with other possibilities.”

or

“Chest pain that worsens with breathing together with recent viral symptoms may occasionally be seen in inflammatory conditions affecting the heart or surrounding tissues. While your symptoms do not strongly confirm this condition, they are sufficient to keep it as a possible consideration.”

# **=================================================================**
** ****PATIENT-FRIENDLY EXPLANATIONS**
The reasoning should answer:

‘Why is the AI suggesting this condition?’

A patient reading the explanation should immediately understand:

- Which of their symptoms support the condition
- Why the condition is being considered
- Why it received its likelihood ranking

Example:

"Viral Infection (Flu/Common Cold) — Likely"

"Reason: The reported fever, sore throat, runny nose, fatigue, and body aches are commonly associated with viral respiratory infections such as influenza or the common cold. These symptoms tend to occur together during viral illnesses and currently provide a stronger match than conditions that would typically present with more localized or severe findings. Because multiple classic viral symptoms are present, this is considered one of the most likely explanations."

# **=================================================================**
** ****OUTPUT FORMAT**
Return:

{

"possible_conditions": [

{

"name": "Condition Name",

"likelihood": "high",

"reason": "Detailed symptom-based clinical reasoning."

}

]

}

# **=================================================================**
** ****ADDITIONAL RULES**

- Mention specific symptoms whenever possible.
- If symptoms strongly support a condition, explicitly state that.
- If symptoms only partially support a condition, explain the uncertainty.
- Avoid repeating identical wording across conditions.
- Every condition should have a different explanation.
- Reasons should typically be 2-5 sentences long.
- The explanation should feel like it was written by a clinician reviewing the patient’s symptoms.

`;
    const userMessage = `Patient Info:
- Age: ${age || "unknown"}
- Gender: ${gender || "unknown"}
${medicalHistoryContext ? `Medical History: ${medicalHistoryContext}
` : ""}Reported Symptoms: ${symptoms}

Use these symptoms to generate possible conditions. Each condition must include a clinician-style reason that references the reported symptoms and explains the assigned likelihood. Do not provide generic disease overviews or template language.`;

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
      const result = tryParseJson(toolCall.function.arguments);
      if (result !== null) {
        const finalResult = await ensureConditionReasons(provider, systemPrompt, userMessage, result);
        return new Response(JSON.stringify(finalResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("[symptom-triage] Could not parse tool call arguments:", toolCall.function.arguments);
    }

    // Fallback: some models may return content instead of tool_calls
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        const finalResult = await ensureConditionReasons(provider, systemPrompt, userMessage, parsed);
        return new Response(JSON.stringify(finalResult), {
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
