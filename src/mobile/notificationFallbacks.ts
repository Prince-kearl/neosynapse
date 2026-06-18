import { Capacitor } from "@capacitor/core";

type PushPermission = "default" | "granted" | "denied";

function envFlag(name: string): boolean {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  return env[name] === true || env[name] === "true";
}

export function isNativeRemotePushConfigured(platform = Capacitor.getPlatform()): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  if (envFlag("VITE_ENABLE_NATIVE_REMOTE_PUSH")) return true;
  if (platform === "ios") return envFlag("VITE_ENABLE_IOS_APNS");
  if (platform === "android") return envFlag("VITE_ENABLE_ANDROID_FCM");
  return false;
}

export function getNotificationCapabilityLabel(platform = Capacitor.getPlatform()): string {
  if (Capacitor.isNativePlatform() && !isNativeRemotePushConfigured(platform)) {
    return "In-app Notifications";
  }
  if (Capacitor.isNativePlatform()) return "Mobile Push Notifications";
  return "Browser Notifications";
}

export function getNotificationCapabilityDescription(
  isSupported: boolean,
  permission: PushPermission,
  platform = Capacitor.getPlatform(),
): string {
  if (Capacitor.isNativePlatform() && !isNativeRemotePushConfigured(platform)) {
    return "Works while the app is open; background push requires APNs or FCM later.";
  }
  if (!isSupported) return "Not supported on this device";
  if (permission === "denied") return "Blocked - enable in device or browser settings";
  return "Get health alerts and appointment reminders";
}

export function vibrateNotification(pattern: VibratePattern = [180, 80, 180]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate?.(pattern);
}

export async function playNotificationTone(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return false;

  try {
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.setValueAtTime(988, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
    window.setTimeout(() => void ctx.close(), 650);
    return true;
  } catch {
    return false;
  }
}
