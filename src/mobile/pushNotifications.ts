import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { PushNotifications, type PermissionStatus, type Token } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

type PushPermission = "default" | "granted" | "denied";

interface StoredPushToken {
  token: string;
  platform: string;
  appVersion: string;
  updatedAt: string;
}

let listenersInitialized = false;
let lastRegisteredUserId: string | null = null;
let pendingTokenPayload: StoredPushToken | null = null;

function toPermission(status: PermissionStatus): PushPermission {
  if (status.receive === "granted") return "granted";
  if (status.receive === "denied") return "denied";
  return "default";
}

export function isNativePushSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export function isPushSupported(): boolean {
  return isNativePushSupported() || typeof Notification !== "undefined";
}

export async function getPushPermission(): Promise<PushPermission> {
  if (isNativePushSupported()) {
    const status = await PushNotifications.checkPermissions();
    return toPermission(status);
  }

  if (typeof Notification === "undefined") return "default";
  return Notification.permission;
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (isNativePushSupported()) {
    const status = await PushNotifications.requestPermissions();
    return toPermission(status);
  }

  if (typeof Notification === "undefined") return "default";
  const result = await Notification.requestPermission();
  return result;
}

async function upsertTokenIntoUserMetadata(userId: string, payload: StoredPushToken) {
  const { data: userResponse } = await supabase.auth.getUser();
  const currentUser = userResponse.user;
  if (!currentUser || currentUser.id !== userId) return;

  const currentMetadata = (currentUser.user_metadata as Record<string, unknown> | undefined) || {};
  const existingTokens = Array.isArray(currentMetadata.mobile_push_tokens)
    ? (currentMetadata.mobile_push_tokens as StoredPushToken[])
    : [];

  const deduped = [
    payload,
    ...existingTokens.filter((item) => item.token !== payload.token),
  ].slice(0, 10);

  await supabase.auth.updateUser({
    data: {
      ...currentMetadata,
      mobile_push_tokens: deduped,
      last_mobile_push_registration_at: payload.updatedAt,
    },
  });
}

async function persistTokenForKnownUser(tokenPayload: StoredPushToken) {
  if (!lastRegisteredUserId) {
    pendingTokenPayload = tokenPayload;
    return;
  }
  await upsertTokenIntoUserMetadata(lastRegisteredUserId, tokenPayload);
}

async function initializeNativeListeners() {
  if (listenersInitialized) return;

  await PushNotifications.addListener("registration", async (token: Token) => {
    try {
      const deviceInfo = await Device.getInfo();
      const payload: StoredPushToken = {
        token: token.value,
        platform: deviceInfo.platform,
        appVersion: deviceInfo.appVersion,
        updatedAt: new Date().toISOString(),
      };

      await persistTokenForKnownUser(payload);
    } catch (error) {
      console.error("[push] Failed to persist registration token:", error);
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.error("[push] Registration error:", error);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[push] Notification received:", notification);
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("[push] Notification action performed:", action);
  });

  listenersInitialized = true;
}

export async function ensureNativePushRegistration(userId: string | null | undefined): Promise<void> {
  if (!isNativePushSupported()) return;

  lastRegisteredUserId = userId || null;

  if (pendingTokenPayload && lastRegisteredUserId) {
    await upsertTokenIntoUserMetadata(lastRegisteredUserId, pendingTokenPayload);
    pendingTokenPayload = null;
  }

  const permission = await getPushPermission();
  if (permission !== "granted") return;

  await initializeNativeListeners();
  await PushNotifications.register();
}

export async function requestAndRegisterNativePush(userId: string | null | undefined): Promise<boolean> {
  if (!isNativePushSupported()) return false;

  const permission = await requestPushPermission();
  if (permission !== "granted") return false;

  await ensureNativePushRegistration(userId);
  return true;
}
