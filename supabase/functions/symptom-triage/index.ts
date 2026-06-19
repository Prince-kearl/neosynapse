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

function normalizeClinicalText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reasonMirrorsDefinition(reason: unknown, definition: unknown): boolean {
  if (typeof reason !== "string" || typeof definition !== "string") return false;
  const normalizedReason = normalizeClinicalText(reason);
  const normalizedDefinition = normalizeClinicalText(definition);
  return normalizedReason.length > 0 && normalizedReason === normalizedDefinition;
}

function hasDuplicateReasons(conditions: any[]): boolean {
  const seen = new Set<string>();
  return conditions.some((condition) => {
    if (typeof condition?.reason !== "string") return false;
    const normalized = normalizeClinicalText(condition.reason);
    if (!normalized) return false;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
    return false;
  });
}

function hasInvalidConditionReasons(result: unknown): boolean {
  if (!shouldRewriteReasons(result)) return false;
  const conditions = (result as any).possible_conditions;
  return (
    hasDuplicateReasons(conditions) ||
    conditions.some((condition: any) =>
      typeof condition.reason !== "string" ||
      condition.reason.trim().length < 50 ||
      isTemplatedReason(condition.reason) ||
      reasonMirrorsDefinition(condition.reason, condition.definition)
    )
  );
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

function isCompleteCondition(condition: any): boolean {
  return (
    typeof condition === "object" && condition !== null &&
    typeof condition.name === "string" && condition.name.trim().length > 0 &&
    typeof condition.likelihood === "string" && ["high", "medium", "low"].includes(condition.likelihood) &&
    typeof condition.confidence === "number" && Number.isFinite(condition.confidence) && condition.confidence >= 0 && condition.confidence <= 100 &&
    typeof condition.reason === "string" && condition.reason.trim().length >= 30 &&
    typeof condition.definition === "string" && condition.definition.trim().length > 0 &&
    typeof condition.causes === "string" && condition.causes.trim().length > 0 &&
    typeof condition.symptoms === "string" && condition.symptoms.trim().length > 0 &&
    typeof condition.treatments === "string" && condition.treatments.trim().length > 0 &&
    typeof condition.first_aid === "string" && condition.first_aid.trim().length > 0 &&
    Array.isArray(condition.sources) && condition.sources.length > 0 &&
    condition.sources.every((source: any) => typeof source === "string" && source.trim().length > 0)
  );
}

function isCompleteTriageResult(result: unknown): result is { urgency: string; summary: string; possible_conditions: any[]; recommended_action: string; questions: unknown[]; warning_signs: unknown[]; urgency_reason: string; risk_factors: unknown[]; medication_considerations: unknown[]; medical_history_impact: unknown[] } {
  return (
    typeof result === "object" && result !== null &&
    typeof (result as any).urgency === "string" &&
    typeof (result as any).summary === "string" &&
    Array.isArray((result as any).possible_conditions) &&
    (result as any).possible_conditions.every(isCompleteCondition) &&
    typeof (result as any).recommended_action === "string" &&
    Array.isArray((result as any).questions) &&
    Array.isArray((result as any).warning_signs) &&
    typeof (result as any).urgency_reason === "string" &&
    Array.isArray((result as any).risk_factors) &&
    Array.isArray((result as any).medication_considerations) &&
    Array.isArray((result as any).medical_history_impact)
  );
}

async function rewriteIncompleteResult(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  previousResult: unknown,
) {
  const rewritePrompt = `${systemPrompt}

REWRITE PASS:
- Return the same full triage result object.
- Ensure every possible_conditions entry includes name, likelihood, reason, definition, causes, symptoms, treatments, first_aid, and sources.
- Do not omit or remove any of those fields.
- Preserve the same urgency, summary, recommended_action, questions, and warning_signs values.
- If a field is missing in a condition, add it with a concise and clinically accurate value.
- If reasons are duplicated, generic, or identical to definitions, rewrite them into unique symptom-specific explanations.
- Add practical first_aid instructions for each condition: safe self-care steps the patient can take now, plus when to seek urgent help.
- Add urgency_reason, risk_factors, medication_considerations, and medical_history_impact.
- Add condition confidence values from 0 to 100 when the symptom/history match supports an estimate.
- Return the result using the triage_assessment function call only.`;

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

Please return the same object with all required condition fields populated.` },
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
    if (parsed !== null && isCompleteTriageResult(parsed)) return parsed;
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const parsed = tryParseJson(content);
    if (parsed !== null && isCompleteTriageResult(parsed)) return parsed;
  }

  return null;
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
- Rewrite only the reason and first_aid fields for each item in possible_conditions.
- Keep urgency, summary, recommended_action, questions, and warning_signs unchanged.
- Replace placeholder or generic reason text with symptom-specific clinical reasoning.
- Do not use general phrases such as "This is a leading possibility based on the symptoms provided." or "This is a plausible possibility, but more information is needed."
- Each reason must explicitly reference the reported symptoms and explain why the condition is being considered.
- Each reason should explain why the assigned likelihood is high, medium, or low.
- Do not repeat the same wording across multiple conditions.
- Do not copy the condition definition into the reason.
- Each first_aid field must give practical immediate self-care steps specific to that condition and must not replace professional care.
- Add urgency_reason, risk_factors, medication_considerations, and medical_history_impact if missing.
- Add condition confidence values from 0 to 100 when the symptom/history match supports an estimate.
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
    hasInvalidConditionReasons(result)
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
              confidence: { type: "number", minimum: 0, maximum: 100 },
              reason: { type: "string", minLength: 20 },
              definition: { type: "string" },
              causes: { type: "string" },
              symptoms: { type: "string" },
              treatments: { type: "string" },
              first_aid: { type: "string" },
              sources: { type: "array", items: { type: "string" } },
            },
            required: ["name", "likelihood", "confidence", "reason", "definition", "causes", "symptoms", "treatments", "first_aid", "sources"],
          },
        },
        recommended_action: { type: "string" },
        urgency_reason: { type: "string" },
        risk_factors: { type: "array", items: { type: "string" } },
        medication_considerations: { type: "array", items: { type: "string" } },
        medical_history_impact: { type: "array", items: { type: "string" } },
        questions: { type: "array", items: { type: "string" } },
        warning_signs: { type: "array", items: { type: "string" } },
      },
      required: ["urgency", "summary", "possible_conditions", "recommended_action", "urgency_reason", "risk_factors", "medication_considerations", "medical_history_impact", "questions", "warning_signs"],
    },
  },
};

// --- Handler ------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, age, gender, language, medicalHistoryContext, assessmentFor, patientContext, patientName } = await req.json();
    const provider = resolveProvider();

    const systemPrompt = `

You are Neo Synapse Triage Engine.

Your role is to perform symptom triage and generate evidence-based clinical hypotheses.

IMPORTANT:

- You are NOT diagnosing.
- You are NOT confirming any disease.
- You are generating possible explanations for the patient’s symptoms.
- Your reasoning must be transparent, symptom-specific, and clinically meaningful.
- Your summary must make the likely severity of the patient’s situation clear and consistent with the urgency rating.
- The summary should tell the patient whether their symptoms are most likely non-urgent, need attention, are urgent, or constitute an emergency.

# **=================================================================**
** ****POSSIBLE CONDITIONS REQUIREMENTS**
For EVERY condition you suggest, you MUST provide:

1. Condition name
2. Likelihood (high, medium, low)
3. Confidence score from 0 to 100
4. Detailed clinical reasoning
5. A concise medical definition
6. Common causes or risk factors
7. Key symptoms that support the condition
8. Typical treatments or management approaches
9. First aid or immediate self-care instructions the patient can follow safely now
10. Trusted medical sources or organizations

The reasoning is the most important part.

Each condition object must include all of the keys listed above. Do not omit definition, causes, symptoms, treatments, first_aid, or sources.
If any of these fields are missing, the response is invalid and must be rewritten before returning.

The reasoning must:

- Explain WHY the condition was suggested.
- Reference the patient’s actual reported symptoms.
- Connect symptoms to known clinical features of the condition.
- Explain which symptoms strongly support the condition.
- Explain why the condition is ranked as Likely, Possible, or Less Likely.
- Read like a doctor’s explanation to a patient.
- Be unique for every condition.
- Be dynamically generated from the patient’s symptoms.
- Be different from the definition field.

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
- What immediate first aid or self-care is appropriate while monitoring symptoms

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

"confidence": 92,

"reason": "Detailed symptom-based clinical reasoning.",

"definition": "A concise medical definition of the condition.",

"causes": "Common causes or risk factors.",

"symptoms": "Key symptoms associated with the condition.",

"treatments": "Typical treatments or management approaches.",

"first_aid": "Immediate self-care steps and when to seek urgent help.",

"sources": ["Trusted medical source 1", "Trusted medical source 2"]

}

]

"urgency_reason": "Why this urgency level was selected, including symptoms and medical history that raise or lower risk.",

"risk_factors": ["Specific risk factor identified from age, symptoms, medical history, or profile"],

"medication_considerations": ["Medication-related safety or adherence consideration relevant to this case"],

"medical_history_impact": ["How a medical history item changed likelihood, urgency, or recommendations"]

}

Ensure every condition object includes definition, causes, symptoms, treatments, first_aid, and sources in the returned JSON.
Ensure the top-level response includes urgency_reason, risk_factors, medication_considerations, and medical_history_impact. Use empty arrays only when no relevant item exists.

# **=================================================================**
** ****ADDITIONAL RULES**

- Mention specific symptoms whenever possible.
- If symptoms strongly support a condition, explicitly state that.
- If symptoms only partially support a condition, explain the uncertainty.
- Avoid repeating identical wording across conditions.
- Every condition should have a different explanation.
- Every condition should have condition-specific first-aid guidance.
- Reasons should typically be 2-5 sentences long.
- The explanation should feel like it was written by a clinician reviewing the patient’s symptoms.
- If medical history is provided, use it as patient-specific context when ranking possible conditions and writing first aid.
- Explicitly account for relevant existing conditions, allergies, current medications, past surgeries, family history, notes, and uploaded-document context when they affect likelihood, safety, medication cautions, or next steps.
- Do not recommend a medication, food, or exposure that conflicts with the patient’s listed allergies or known medical history.
- If a history item is relevant, mention it briefly in the condition reason or first_aid. If it is not relevant, do not force it into the answer.
- For emergency or urgent results, urgency_reason must clearly explain why that level was selected.
- risk_factors should list specific factors found in the submitted symptoms, age, profile, or medical history.
- medication_considerations should include missed-dose, side-effect, interaction, allergy, kidney/liver, or monitoring considerations only when relevant.
- medical_history_impact should make personalization obvious by stating how the patient's history changed likelihood, urgency, or next steps.
- Confidence values should be clinically cautious estimates from 0 to 100; do not present them as diagnostic certainty.

`;
    const assessmentNotice =
      assessmentFor === "self"
        ? "This assessment is for the authenticated patient themselves."
        : assessmentFor === "other"
          ? "This assessment is for another person." +
            (patientName ? ` Name: ${patientName}.` : "") +
            (patientContext ? " Additional patient details: " + patientContext : "")
          : "This assessment is for a patient.";

    const medicalHistorySection = medicalHistoryContext ? `Medical History: ${medicalHistoryContext}\n` : "";
    const patientProfileSection = patientContext ? `Patient Profile: ${patientContext}\n` : "";
    const patientNameSection = patientName ? `Patient Name: ${patientName}\n` : "";
    const userMessage = `Patient Info:\n- Age: ${age || "unknown"}\n- Gender: ${gender || "unknown"}\n${assessmentNotice}\n${patientNameSection}${medicalHistorySection}${patientProfileSection}Reported Symptoms: ${symptoms}\n\nUse these symptoms to generate possible conditions. When Medical History is present, treat it as patient-specific context: chronic conditions can change risk, allergies can change safe first aid, current medications can affect cautions, past surgeries can change likely explanations, and family history can influence risk. Each condition must include a unique clinician-style reason that references the reported symptoms, explains the assigned likelihood and confidence, and shows how the symptom pattern supports that condition. The reason must not be identical to the definition and must not be reused across conditions. Each condition must also include first_aid with safe immediate self-care steps for the patient and must avoid advice that conflicts with listed allergies, medications, or history. Include urgency_reason, risk_factors, medication_considerations, and medical_history_impact so the patient can see why the result was personalized. Do not provide generic disease overviews or template language.`;

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
        const resultWithReasons = await ensureConditionReasons(provider, systemPrompt, userMessage, result);
        const finalResult = isCompleteTriageResult(resultWithReasons)
          ? resultWithReasons
          : await rewriteIncompleteResult(provider, systemPrompt, userMessage, resultWithReasons);

        if (finalResult) {
          return new Response(JSON.stringify(finalResult), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      console.error("[symptom-triage] Could not parse tool call arguments:", toolCall.function.arguments);
    }

    // Fallback: some models may return content instead of tool_calls
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = tryParseJson(content);
      if (parsed !== null) {
        const resultWithReasons = await ensureConditionReasons(provider, systemPrompt, userMessage, parsed);
        const finalResult = isCompleteTriageResult(resultWithReasons)
          ? resultWithReasons
          : await rewriteIncompleteResult(provider, systemPrompt, userMessage, resultWithReasons);

        if (finalResult) {
          return new Response(JSON.stringify(finalResult), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
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
