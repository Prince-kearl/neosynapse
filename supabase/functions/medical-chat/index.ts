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

If the user asks for a medical report, then generate a structured report in the exact format below and also return valid JSON after a clear delimiter.
- Only include the report markdown and JSON when the user specifically requests it.
- If asked for a report, use the delimiter "---JSON---" before the JSON block.

# 🏥 AI MEDICAL ASSESSMENT REPORT

---

## **Patient Information**

* **Patient Name:** __________________________
* **Patient ID:** __________________________
* **Age:** __________________________
* **Gender:** __________________________
* **Date & Time:** __________________________

---

## **Consultation Summary**

* **Primary Complaint:** __________________________________________

* **Symptoms Reported:**
  * ---
  * ---
  * ---

* **Duration of Symptoms:** ______________________________________

* **Severity (if applicable):** ____________________________________

---

## **Clinical Observations (AI Assessment)**

Based on the information provided during the consultation:
* ---
* ---
* ---

---

## **Possible Diagnoses**

*(These are not confirmed diagnoses but possible conditions based on symptoms)*

1. **__________________________________________**
   * Brief Explanation: ______________________________________
2. **__________________________________________**
   * Brief Explanation: ______________________________________
3. **__________________________________________**
   * Brief Explanation: ______________________________________

---

## **Risk Assessment**

* **Risk Level:** ☐ Low   ☐ Moderate   ☐ High

* **Reason for Risk Level:**
  ---
  ---

---

## **Recommended Action**

* ☐ Self-care at home
* ☐ Schedule a doctor’s visit
* ☐ Seek urgent medical attention

**Details:**
---
---
---

## **Home Care & First Aid Advice**

* ---
* ---
* ---

---

## **Medications (General Guidance Only)**

*(Only over-the-counter recommendations where appropriate)*

* ---
* ---

---

## **When to Seek Immediate Help 🚨**

Please seek urgent medical attention if you experience:

* ---
* ---
* ---

---

## **Follow-Up Recommendations**

* ---
* ---

---

## **Additional Notes**

---
---
---

## **Disclaimer**

This report is generated by an AI health assistant based on user-provided information.
It is **not a medical diagnosis** and does not replace consultation with a qualified healthcare professional.

---

## **Report Metadata**

* **Report ID:** __________________________
* **Generated By:** AI Health Assistant
* **Generated On:** _______________________

---

**End of Report**

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
