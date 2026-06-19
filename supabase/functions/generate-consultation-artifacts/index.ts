import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  model: string;
}

function resolveProvider(): ProviderConfig {
  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (googleKey) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: {
        Authorization: `Bearer ${googleKey}`,
        "Content-Type": "application/json",
      },
      model: "gemini-2.5-flash",
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
    };
  }

  throw new Error("No AI provider configured. Set GOOGLE_AI_API_KEY or LOVABLE_API_KEY.");
}

function extractJson(content: string) {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1] || content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  return JSON.parse(jsonText);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      transcriptText,
      transcriptJson,
      encounterId,
      patientName,
      doctorName,
      medicalHistoryContext,
    } = await req.json();

    const text = typeof transcriptText === "string" ? transcriptText.trim() : "";
    if (!text) throw new Error("transcriptText is required");

    const provider = resolveProvider();
    const systemPrompt = `You are Neo Synapse clinical documentation AI.
Generate documentation support for a licensed healthcare professional after a telemedicine consultation.

Rules:
- Use only facts present in the transcript or supplied context.
- Do not invent examination findings, diagnoses, medications, vitals, labs, or procedures.
- Mark uncertainty clearly.
- Include safety-net advice and follow-up where the transcript supports it.
- Output valid JSON only. No markdown fences unless the model cannot avoid them.
- Report markdown must look like a professional NeoSynapse clinical report suitable for patient records, not a flashy AI report.
- Do not use emoji, futuristic styling, chatbot language, or marketing copy.
- Use clear clinical sections, professional tables where useful, clinician review wording, signature/stamp placeholders, and GHIMS-compatible documentation language.
- The JSON must have keys: report, soap_note, sop_draft, quality_flags.
- report must include: title, status, doctor, patient, generated_at, summary, chief_complaint, symptoms, assessment, plan, follow_up, safety_net, markdown, clinical_markdown, patient_friendly_report.
- report.title should be "Clinical Assessment and Triage Report" when the transcript is being converted into a general consultation report.
- report.clinical_markdown should start with "# NeoSynapse" and include "Ghana Health Information Management System (GHIMS)".
- soap_note must include: subjective, objective, assessment, plan.
- sop_draft means a practical consultation standard operating procedure / care workflow draft, not a confirmed institutional policy. It must include: title, purpose, steps, documentation_checklist, escalation_criteria, disclaimer.`;

    const userPrompt = `Encounter ID: ${encounterId || "unknown"}
Patient: ${patientName || "Patient"}
Professional: ${doctorName || "Healthcare professional"}
Medical history context:
${medicalHistoryContext || "Not provided"}

Transcript JSON:
${JSON.stringify(transcriptJson || {}, null, 2).slice(0, 12000)}

Transcript text:
${text.slice(0, 18000)}`;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("consultation artifacts AI error:", response.status, errorText);
      throw new Error("AI documentation generation failed");
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("AI response did not contain content");

    const artifacts = extractJson(content);
    return new Response(JSON.stringify(artifacts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-consultation-artifacts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
