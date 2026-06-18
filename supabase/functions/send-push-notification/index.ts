import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.15.5/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TargetPlatform = "android" | "ios" | "web" | "unknown";

interface StoredPushToken {
  token: string;
  platform?: string;
  appVersion?: string;
  updatedAt?: string;
}

interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

interface PushRequestBody {
  target_user_id?: string;
  target_user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: string;
  actions?: NotificationAction[];
  urgency?: "normal" | "high";
  dry_run?: boolean;
}

interface DeliveryResult {
  user_id: string;
  token: string;
  platform: TargetPlatform;
  status: "sent" | "skipped" | "failed";
  provider: "fcm" | "apns" | "none";
  message?: string;
  provider_response?: unknown;
}

let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

function normalizePlatform(value: string | undefined): TargetPlatform {
  const v = (value || "").toLowerCase();
  if (v === "android") return "android";
  if (v === "ios") return "ios";
  if (v === "web") return "web";
  return "unknown";
}

function pickTargetUserIds(payload: PushRequestBody): string[] {
  const all = [
    ...(payload.target_user_id ? [payload.target_user_id] : []),
    ...((payload.target_user_ids || []).filter(Boolean)),
  ];

  const dedup = new Set<string>();
  all.forEach((id) => dedup.add(id));
  return [...dedup];
}

function sanitizeData(data: Record<string, unknown> | undefined): Record<string, string> {
  if (!data) return {};

  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!key) continue;
    if (value === null || value === undefined) continue;
    output[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return output;
}

function sanitizeActions(actions: NotificationAction[] | undefined): NotificationAction[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((action) => action?.id && action?.title)
    .map((action) => ({
      id: String(action.id),
      title: String(action.title),
      icon: typeof action.icon === "string" ? action.icon : undefined,
    }));
}

function toInAppCategory(category: string | undefined): "general" | "appointment" | "clinical" | "system" | "security" {
  if (!category) return "general";
  const normalized = category.toLowerCase();
  if (normalized.includes("appointment") || normalized.includes("telemedicine")) return "appointment";
  if (normalized.includes("clinical") || normalized.includes("health") || normalized.includes("medical")) return "clinical";
  if (normalized.includes("security")) return "security";
  if (normalized.includes("system")) return "system";
  return "general";
}

async function sendWithFcm(args: {
  token: string;
  title: string;
  body: string;
  urgency: "normal" | "high";
  data: Record<string, string>;
  actions?: NotificationAction[];
}): Promise<{ ok: boolean; response: unknown; message?: string }> {
  const key = Deno.env.get("FCM_SERVER_KEY");
  if (!key) {
    return { ok: false, response: null, message: "FCM_SERVER_KEY is not configured" };
  }

  const fcmPayload: Record<string, unknown> = {
    to: args.token,
    priority: args.urgency === "high" ? "high" : "normal",
    notification: {
      title: args.title,
      body: args.body,
      sound: "default",
    },
    data: args.data,
  };

  if (args.actions && args.actions.length > 0) {
    fcmPayload.android = {
      notification: {
        actions: args.actions.map((action) => ({
          title: action.title,
          action: action.id,
          icon: action.icon,
        })),
      },
    };
  }

  const resp = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fcmPayload),
  });

  const responseBody = await resp.text();
  if (!resp.ok) {
    return {
      ok: false,
      response: responseBody,
      message: `FCM send failed (${resp.status})`,
    };
  }

  return {
    ok: true,
    response: responseBody,
  };
}

async function sendWithApns(args: {
  token: string;
  title: string;
  body: string;
  urgency: "normal" | "high";
  data: Record<string, string>;
  category?: string;
}): Promise<{ ok: boolean; response: unknown; message?: string }> {
  const bearerToken = await resolveApnsBearerToken();
  const topic = Deno.env.get("APNS_TOPIC");

  if (!bearerToken || !topic) {
    return {
      ok: false,
      response: null,
      message: "APNs credentials are not configured. Set APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY, and APNS_TOPIC.",
    };
  }

  const apnsEnvironment = (Deno.env.get("APNS_ENVIRONMENT") || "production").toLowerCase();
  const apnsHost = apnsEnvironment === "development" || apnsEnvironment === "sandbox"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";

  const resp = await fetch(`${apnsHost}/3/device/${args.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${bearerToken}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": args.urgency === "high" ? "10" : "5",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: {
        alert: {
          title: args.title,
          body: args.body,
        },
        sound: "default",
        ...(args.category ? { category: args.category } : {}),
      },
      data: args.data,
    }),
  });

  const responseBody = await resp.text();
  if (!resp.ok) {
    return {
      ok: false,
      response: responseBody,
      message: `APNs send failed (${resp.status})`,
    };
  }

  return {
    ok: true,
    response: responseBody || "ok",
  };
}

async function resolveApnsBearerToken(): Promise<string | null> {
  const staticToken = Deno.env.get("APNS_BEARER_TOKEN");
  if (staticToken) return staticToken;

  const teamId = Deno.env.get("APNS_TEAM_ID");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > now + 60) {
    return cachedApnsJwt.token;
  }

  const key = await importPKCS8(privateKey, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 50 * 60)
    .sign(key);

  cachedApnsJwt = { token, expiresAt: now + 50 * 60 };
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PushRequestBody = await req.json();
    if (!body.title?.trim() || !body.body?.trim()) {
      return new Response(JSON.stringify({ error: "Both title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUserIds = pickTargetUserIds(body);
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: "Provide target_user_id or target_user_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserIds.length > 50) {
      return new Response(JSON.stringify({ error: "Maximum 50 target users per request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorId = claimsData.claims.sub;

    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId);

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowed = (roles || []).some((r: { role: string }) => ["admin", "professional"].includes(r.role));
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urgency = body.urgency === "high" ? "high" : "normal";
    const dryRun = body.dry_run === true;
    const dataPayload = sanitizeData(body.data);
    const actionsPayload = sanitizeActions(body.actions);
    const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : undefined;
    const actionUrl = typeof body.data?.action_url === "string" ? body.data.action_url : null;
    const deliveryResults: DeliveryResult[] = [];

    for (const targetUserId of targetUserIds) {
      if (!dryRun) {
        const { error: inAppError } = await supabaseAdmin.rpc("create_user_notification", {
          p_user_id: targetUserId,
          p_title: body.title,
          p_body: body.body,
          p_category: toInAppCategory(category),
          p_action_url: actionUrl,
          p_metadata: JSON.stringify({
            ...(body.data || {}),
            category: category || "general",
            urgency,
            fallback_delivery: true,
          }),
        });
        if (inAppError) {
          console.error("Failed to create fallback in-app notification:", inAppError);
        }
      }

      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (userError || !userData?.user) {
        deliveryResults.push({
          user_id: targetUserId,
          token: "",
          platform: "unknown",
          status: "failed",
          provider: "none",
          message: userError?.message || "Target user not found",
        });
        continue;
      }

      const metadata = (userData.user.user_metadata as Record<string, unknown> | null) || {};
      const tokens = Array.isArray(metadata.mobile_push_tokens)
        ? (metadata.mobile_push_tokens as StoredPushToken[])
        : [];

      if (tokens.length === 0) {
        deliveryResults.push({
          user_id: targetUserId,
          token: "",
          platform: "unknown",
          status: "skipped",
          provider: "none",
          message: "No mobile_push_tokens found for target user",
        });
        continue;
      }

      for (const tokenEntry of tokens) {
        if (!tokenEntry?.token) continue;

        const platform = normalizePlatform(tokenEntry.platform);

        if (dryRun) {
          deliveryResults.push({
            user_id: targetUserId,
            token: tokenEntry.token,
            platform,
            status: "skipped",
            provider: "none",
            message: "dry_run enabled",
          });
          continue;
        }

        if (platform === "android") {
          const sent = await sendWithFcm({
            token: tokenEntry.token,
            title: body.title,
            body: body.body,
            urgency,
            data: dataPayload,
            actions: actionsPayload,
          });

          deliveryResults.push({
            user_id: targetUserId,
            token: tokenEntry.token,
            platform,
            status: sent.ok ? "sent" : "failed",
            provider: "fcm",
            message: sent.message,
            provider_response: sent.response,
          });
          continue;
        }

        if (platform === "ios") {
          const sent = await sendWithApns({
            token: tokenEntry.token,
            title: body.title,
            body: body.body,
            urgency,
            data: dataPayload,
            category,
          });

          deliveryResults.push({
            user_id: targetUserId,
            token: tokenEntry.token,
            platform,
            status: sent.ok ? "sent" : "failed",
            provider: "apns",
            message: sent.message,
            provider_response: sent.response,
          });
          continue;
        }

        deliveryResults.push({
          user_id: targetUserId,
          token: tokenEntry.token,
          platform,
          status: "skipped",
          provider: "none",
          message: `Unsupported or unknown platform: ${platform}`,
        });
      }
    }

    const sentCount = deliveryResults.filter((r) => r.status === "sent").length;
    const failedCount = deliveryResults.filter((r) => r.status === "failed").length;
    const skippedCount = deliveryResults.filter((r) => r.status === "skipped").length;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      action: dryRun ? "push_notification_dry_run" : "push_notification_dispatch",
      entity_type: "notification_batch",
      entity_id: crypto.randomUUID(),
      metadata: {
        target_user_ids: targetUserIds,
        title: body.title,
        urgency,
        dry_run: dryRun,
        sent_count: sentCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      dry_run: dryRun,
      totals: {
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      },
      deliveries: deliveryResults,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
