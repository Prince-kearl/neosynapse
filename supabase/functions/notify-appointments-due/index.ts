import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.15.5/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePlatform(value: string | undefined) {
  const v = (value || "").toLowerCase();
  if (v === "android") return "android";
  if (v === "ios") return "ios";
  if (v === "web") return "web";
  return "unknown";
}

let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

async function sendWithFcm(key: string | undefined, token: string, title: string, body: string, urgency: "normal" | "high", data: Record<string, string>) {
  if (!key) return { ok: false, message: "FCM_SERVER_KEY not configured" };
  const fcmPayload: Record<string, unknown> = {
    to: token,
    priority: urgency === "high" ? "high" : "normal",
    notification: { title, body, sound: "default" },
    data,
  };

  const resp = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: { Authorization: `key=${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(fcmPayload),
  });

  const text = await resp.text();
  return { ok: resp.ok, response: text, status: resp.status };
}

async function resolveApnsBearerToken(): Promise<string | null> {
  const staticToken = Deno.env.get("APNS_BEARER_TOKEN");
  if (staticToken) return staticToken;

  const teamId = Deno.env.get("APNS_TEAM_ID");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > now + 60) return cachedApnsJwt.token;

  const key = await importPKCS8(privateKey, "ES256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 50 * 60)
    .sign(key);

  cachedApnsJwt = { token: jwt, expiresAt: now + 50 * 60 };
  return jwt;
}

async function sendWithApns(topic: string | undefined, token: string, title: string, body: string, urgency: "normal" | "high", data: Record<string, string>, category?: string) {
  const bearerToken = await resolveApnsBearerToken();
  if (!bearerToken || !topic) {
    return {
      ok: false,
      message: "APNs credentials not configured. Set APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY, and APNS_TOPIC.",
    };
  }

  const apnsEnvironment = (Deno.env.get("APNS_ENVIRONMENT") || "production").toLowerCase();
  const apnsHost = apnsEnvironment === "development" || apnsEnvironment === "sandbox"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";

  const resp = await fetch(`${apnsHost}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${bearerToken}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": urgency === "high" ? "10" : "5",
      "content-type": "application/json",
    },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: "default", ...(category ? { category } : {}) }, data }),
  });

  const text = await resp.text();
  return { ok: resp.ok, response: text, status: resp.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find due reminders (scheduled_for <= now) that haven't been sent yet
    const now = new Date().toISOString();
    const { data: reminders, error: remErr } = await supabaseAdmin
      .from("appointment_reminders")
      .select("id, scheduled_for, sent, appointment:appointments(id, patient_id, professional_id, scheduled_at, status)")
      .lte("scheduled_for", now)
      .eq("sent", false)
      .limit(100);

    if (remErr) {
      console.error("Failed to query appointment_reminders:", remErr);
      return new Response(JSON.stringify({ error: remErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ reminder_id: string; appointment_id: string; patientDelivery?: unknown; professionalDelivery?: unknown }> = [];

    const fcmKey = Deno.env.get("FCM_SERVER_KEY");
    const apnsTopic = Deno.env.get("APNS_TOPIC");

    for (const rem of (reminders || [])) {
      try {
        const reminderId = rem.id;
        const appointment = rem.appointment;
        if (!appointment) {
          console.warn("Skipping reminder with no appointment", reminderId);
          continue;
        }
        const appointmentId = appointment.id;
        const scheduledAt = appointment.scheduled_at;

        // Create in-app notifications for patient and professional
        const patientTitle = "Appointment starting now";
        const patientBody = `Your appointment is scheduled for ${new Date(scheduledAt).toLocaleString()}.`;

        await supabaseAdmin.rpc("create_user_notification", {
          p_user_id: appointment.patient_id,
          p_title: patientTitle,
          p_body: patientBody,
          p_category: "appointment",
          p_action_url: "/patient/appointments",
          p_metadata: JSON.stringify({ appointment_id: appointmentId, reminder_id: reminderId }),
        });

        // professional
        if (appointment.professional_id) {
          const profTitle = "Appointment starting now";
          const profBody = `You have an appointment scheduled for ${new Date(scheduledAt).toLocaleString()}.`;
          await supabaseAdmin.rpc("create_user_notification", {
            p_user_id: appointment.professional_id,
            p_title: profTitle,
            p_body: profBody,
            p_category: "appointment",
            p_action_url: "/professional/appointments",
            p_metadata: JSON.stringify({ appointment_id: appointmentId, reminder_id: reminderId }),
          });
        }

        // Fetch and send mobile push tokens for each user
        const patientUser = await supabaseAdmin.auth.admin.getUserById(appointment.patient_id);
        let patientDelivery = null;
        if (patientUser?.data?.user) {
          const metadata = (patientUser.data.user.user_metadata || {}) as any;
          const tokens = Array.isArray(metadata.mobile_push_tokens) ? metadata.mobile_push_tokens : [];

          for (const t of tokens) {
            if (!t?.token) continue;
            const platform = normalizePlatform(t.platform);
            const urgency = "normal";
            const dataPayload = { appointment_id: appointmentId };
            if (platform === "android") {
              patientDelivery = await sendWithFcm(fcmKey, t.token, patientTitle, patientBody, urgency, dataPayload);
            } else if (platform === "ios") {
              patientDelivery = await sendWithApns(apnsTopic, t.token, patientTitle, patientBody, urgency, dataPayload, "appointment");
            }
          }
        }

        let professionalDelivery = null;
        if (appointment.professional_id) {
          const profUser = await supabaseAdmin.auth.admin.getUserById(appointment.professional_id);
          if (profUser?.data?.user) {
            const metadata = (profUser.data.user.user_metadata || {}) as any;
            const tokens = Array.isArray(metadata.mobile_push_tokens) ? metadata.mobile_push_tokens : [];
            const profTitle = "Appointment starting now";
            const profBody = `You have an appointment scheduled for ${new Date(scheduledAt).toLocaleString()}.`;
            for (const t of tokens) {
              if (!t?.token) continue;
              const platform = normalizePlatform(t.platform);
              const urgency = "normal";
              const dataPayload = { appointment_id: appointmentId };
              if (platform === "android") {
                professionalDelivery = await sendWithFcm(fcmKey, t.token, profTitle, profBody, urgency, dataPayload);
              } else if (platform === "ios") {
                professionalDelivery = await sendWithApns(apnsTopic, t.token, profTitle, profBody, urgency, dataPayload, "appointment");
              }
            }
          }
        }

        // mark this reminder row as sent
        await supabaseAdmin.from("appointment_reminders").update({ sent: true }).eq("id", reminderId);

        results.push({ reminder_id: reminderId, appointment_id: appointmentId, patientDelivery, professionalDelivery });
      } catch (err) {
        console.error("Failed to process appointment reminder:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("notify-appointments-due error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
