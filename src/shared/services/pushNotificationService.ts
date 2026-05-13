import { supabase } from "@/integrations/supabase/client";

export interface SendPushRequest {
  targetUserId?: string;
  targetUserIds?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  urgency?: "normal" | "high";
  dryRun?: boolean;
}

export interface SendPushResponse {
  success: boolean;
  dry_run: boolean;
  totals: {
    sent: number;
    failed: number;
    skipped: number;
  };
  deliveries: Array<{
    user_id: string;
    token: string;
    platform: string;
    status: "sent" | "failed" | "skipped";
    provider: "fcm" | "apns" | "none";
    message?: string;
    provider_response?: unknown;
  }>;
}

export const pushNotificationService = {
  sendTestPush: async (payload: SendPushRequest) => {
    const body = {
      target_user_id: payload.targetUserId,
      target_user_ids: payload.targetUserIds,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      urgency: payload.urgency || "normal",
      dry_run: payload.dryRun === true,
    };

    const { data, error } = await supabase.functions.invoke("send-push-notification", { body });
    if (error) throw error;

    if ((data as any)?.error) {
      throw new Error((data as any).error);
    }

    return data as SendPushResponse;
  },
};
