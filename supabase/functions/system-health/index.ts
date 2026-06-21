import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const functionNames = [
  "medical-chat",
  "symptom-triage",
  "send-invitation",
  "accept-invitation",
  "speech-to-text",
  "text-to-speech",
  "send-push-notification",
  "notify-appointments-due",
  "generate-consultation-artifacts",
  "translate-text",
] as const;

type ProbeStatus = "active" | "protected" | "missing" | "error";

function classifyStatus(status: number): ProbeStatus {
  if (status >= 200 && status < 400) return "active";
  if (status === 401 || status === 403) return "protected";
  if (status === 404) return "missing";
  return "error";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server health-check configuration is incomplete." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Authentication is required." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "The current session is invalid." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: adminRole, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !adminRole) {
    return new Response(JSON.stringify({ error: "Administrator access is required." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const checks = await Promise.all(functionNames.map(async (name) => {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "OPTIONS",
        headers: {
          apikey: anonKey,
          Authorization: authorization,
        },
        signal: controller.signal,
      });
      return {
        name,
        status: classifyStatus(response.status),
        http_status: response.status,
        latency_ms: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      return {
        name,
        status: "error" as const,
        http_status: null,
        latency_ms: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : "Probe failed",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }));

  const totals = checks.reduce(
    (result, check) => ({ ...result, [check.status]: result[check.status] + 1 }),
    { active: 0, protected: 0, missing: 0, error: 0 } as Record<ProbeStatus, number>,
  );

  return new Response(JSON.stringify({ checks, totals, checked_at: new Date().toISOString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
