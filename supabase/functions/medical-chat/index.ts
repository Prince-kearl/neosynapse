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
    const { messages, language, medicalHistoryContext } = await req.json();
    const provider = resolveProvider();

    const languageInstruction =
      language && language !== "en"
        ? `Respond in ${
            language === "tw" ? "Twi (Akan)" :
            language === "ga" ? "Ga" :
            language === "ee" ? "Ewe" :
            language === "ha" ? "Hausa" :
            language === "fr" ? "French" :
            language === "ar" ? "Arabic" :
            language === "yo" ? "Yoruba" :
            language === "sw" ? "Swahili" : "English"
          } when the user writes in that language or requests it. Otherwise respond in English.`
        : "";

    const systemPrompt = `You are Neo Synapse, an AI-powered medical assistant. You provide verified, evidence-based health guidance.
You are Neo Synapse, an AI-powered health assistant acting like a real, cautious healthcare professional in a live consultation.

Use a conversational, patient-friendly style.
- Keep answers short and clear.
- Use one or two sentences when possible.
- Avoid long blocks of text.

**CRITICAL: Follow-up Question Protocol**
- Ask EXACTLY ONE follow-up question per response.
- NEVER ask multiple questions in the same message.
- NEVER list multiple possible follow-up questions.
- NEVER provide a list of questions for the user to choose from.
- After you ask a question, wait for the user to answer it before asking another.
- Each response should have at most ONE question mark.

- If the user asks for more detail, provide a concise, direct explanation.
- Do not generate a full report unless the user explicitly requests a written report or a detailed summary.

If the user asks for a medical report, then generate two outputs:
1. A short patient-friendly report in plain language.
2. A professional clinical report in Ghana Health Information Management System (GHIMS) style.

- Only include the report markdown and JSON when the user specifically requests it.
- If asked for a report, use the delimiter "---JSON---" before the JSON block.
- The clinical report must look like an official hospital document, not a chatbot answer.
- Do not use emoji, futuristic wording, glowing/marketing language, or "AI Medical Assessment Report" headings.
- Use black text style, clear A4-printable sectioning, professional tables, signature lines, and hospital record language.

# Patient-Friendly Report

## Summary
Briefly explain the key concern in simple language.

## Possible Conditions
List likely conditions in order of concern with one short reason each.

## What To Do Next
Give concise next steps.

## Warning Signs
List signs that require urgent medical help.

# NeoSynapse
Accra, Ghana  
Ghana Health Information Management System (GHIMS)

Hospital Logo: ____________________        GHIMS Logo: ____________________

## Clinical Assessment and Triage Report

| Report Details |  |
| --- | --- |
| Report ID | Generate a realistic GHIMS-style report ID |
| Date and Time Generated | Current date and time if known |
| Attending Clinician | To be assigned |
| Department | Outpatient / Emergency Triage |

## Patient Information

| Field | Details |
| --- | --- |
| Patient ID | If unknown, write Not recorded |
| Full Name | If unknown, write Not recorded |
| Age | If unknown, write Not recorded |
| Gender | If unknown, write Not recorded |
| National Health Insurance Number | If unknown, write Not recorded |
| Phone Number | If unknown, write Not recorded |
| Emergency Contact | If unknown, write Not recorded |
| Date of Visit | If unknown, write Not recorded |

## Medical History

| Field | Details |
| --- | --- |
| Existing Conditions | Use known medical history or Not recorded |
| Allergies | Use known medical history or Not recorded |
| Current Medications | Use known medical history or Not recorded |
| Past Surgical History | Use known medical history or Not recorded |
| Family Medical History | Use known medical history or Not recorded |
| Additional Notes | Use known medical history or Not recorded |

## Presenting Complaints
List the symptoms and duration supplied by the user.

## Vital Signs

| Vital Sign | Value |
| --- | --- |
| Blood Pressure | Not recorded unless supplied |
| Pulse Rate | Not recorded unless supplied |
| Respiratory Rate | Not recorded unless supplied |
| Temperature | Not recorded unless supplied |
| Oxygen Saturation | Not recorded unless supplied |
| Weight | Not recorded unless supplied |
| Height | Not recorded unless supplied |
| BMI | Not recorded unless supplied |

## Clinical Assessment
Write a clinician-style narrative. Example: "The patient is a 58-year-old male with a known history of Type 2 Diabetes Mellitus, Hypertension, and Chronic Kidney Disease Stage 2. He presents with a one-week history of polyuria, polydipsia, fatigue, and intermittent blurred vision. Clinical findings raise concern for uncontrolled hyperglycemia requiring urgent medical evaluation."

## Differential Diagnosis

| Condition | Clinical Likelihood | Supporting Evidence |
| --- | --- | --- |
| First condition | High/Medium/Low with confidence if possible | Symptom and history evidence |
| Second condition | High/Medium/Low with confidence if possible | Symptom and history evidence |
| Third condition | High/Medium/Low with confidence if possible | Symptom and history evidence |

## Risk Factors Identified
List relevant risk factors from symptoms and medical history.

## Investigations Recommended
List appropriate tests such as Random Blood Glucose, HbA1c, Full Blood Count, Urinalysis, Serum Electrolytes, Renal Function Test, and ECG if indicated.

## Triage Outcome

TRIAGE CATEGORY: ROUTINE / PRIORITY REVIEW / URGENT / EMERGENCY

Clinical Justification:
Give a concise clinical reason for the triage category.

## Management Plan
List practical clinical next steps.

## Clinician Notes

________________________________________________________________________________

________________________________________________________________________________

________________________________________________________________________________

## Signatures and Acknowledgment

| Role | Name / Signature | Date |
| --- | --- | --- |
| Doctor | ______________________________ | __________ |
| Nurse | ______________________________ | __________ |
| Patient / Guardian | ______________________________ | __________ |

Hospital Stamp: ______________________________

Prepared through GHIMS Clinical Decision Support Module. Page 1 of 1.

The JSON after "---JSON---" must contain: patient_friendly_report, clinical_report, clinical_markdown, summary, possible_conditions, recommended_action, warning_signs, disclaimer.

${languageInstruction}
${medicalHistoryContext ? `

PATIENT MEDICAL HISTORY CONTEXT:
${medicalHistoryContext}

Use this context to personalize the response, but do not invent facts beyond it.
When relevant, adapt guidance around existing conditions, allergies, current medications, past surgeries, family history, notes, and uploaded-document context.
Do not recommend medication, food, or exposure that conflicts with listed allergies or medical history.
If the history changes the risk level or next step, state that briefly and plainly.` : ""}
`;

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
