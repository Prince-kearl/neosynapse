import { supabase } from "@/integrations/supabase/client";

export interface SendPushAction {
  id: string;
  title: string;
  icon?: string;
}

export interface SendPushRequest {
  targetUserId?: string;
  targetUserIds?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: string;
  actions?: SendPushAction[];
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

export interface SendTelemedicinePushRequest {
  professionalId: string;
  encounterId: string;
  roomId: string;
  patientName: string;
  title?: string;
  body?: string;
  urgency?: "normal" | "high";
  dryRun?: boolean;
}

export interface SendPatientTelemedicineCallRequest {
  patientId: string;
  encounterId: string;
  roomId: string;
  doctorName: string;
  appointmentId?: string;
  title?: string;
  body?: string;
  urgency?: "normal" | "high";
  dryRun?: boolean;
}

const sendTestPush = async (payload: SendPushRequest) => {
  const body = {
    target_user_id: payload.targetUserId,
    target_user_ids: payload.targetUserIds,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    category: payload.category,
    actions: payload.actions,
    urgency: payload.urgency || "normal",
    dry_run: payload.dryRun === true,
  };

  const { data, error } = await supabase.functions.invoke("send-push-notification", { body });
  if (error) throw error;

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  return data as SendPushResponse;
};

const sendTelemedicineCallNotification = async (payload: SendTelemedicinePushRequest) => {
  return sendTestPush({
    targetUserId: payload.professionalId,
    title: payload.title || "Incoming telemedicine call",
    body: payload.body || `${payload.patientName} has requested a telemedicine consultation.`,
    urgency: payload.urgency ?? "high",
    dryRun: payload.dryRun,
    category: "telemedicine_call",
    actions: [
      { id: "accept", title: "Accept" },
      { id: "reject", title: "Reject" },
    ],
    data: {
      type: "telemedicine_call",
      encounterId: payload.encounterId,
      roomId: payload.roomId,
      patientName: payload.patientName,
      action: "accept",
      action_url: `/professional/telemedicine?encounterId=${encodeURIComponent(payload.encounterId)}&action=accept`,
    },
  });
};

const sendPatientTelemedicineCallNotification = async (payload: SendPatientTelemedicineCallRequest) => {
  return sendTestPush({
    targetUserId: payload.patientId,
    title: payload.title || "Doctor is calling",
    body: payload.body || `${payload.doctorName} started your telemedicine consultation.`,
    urgency: payload.urgency ?? "high",
    dryRun: payload.dryRun,
    category: "telemedicine_call",
    actions: [
      { id: "join", title: "Join" },
    ],
    data: {
      type: "telemedicine_call",
      encounterId: payload.encounterId,
      roomId: payload.roomId,
      appointmentId: payload.appointmentId || "",
      doctorName: payload.doctorName,
      action: "join",
      action_url: `/patient/telemedicine?encounterId=${encodeURIComponent(payload.encounterId)}&roomId=${encodeURIComponent(payload.roomId)}&action=join`,
    },
  });
};

export const pushNotificationService = {
  sendTestPush,
  sendTelemedicineCallNotification,
  sendPatientTelemedicineCallNotification,
};
