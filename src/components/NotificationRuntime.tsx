import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientProfile } from "@/shared/hooks/useHealthcare";
import { getPatientProfileMeta } from "@/shared/lib/patientSettings";
import { playNotificationTone, vibrateNotification } from "@/mobile/notificationFallbacks";

type RealtimeNotification = {
  id: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

function canShowWebNotification(browserNotificationsEnabled: boolean) {
  return (
    browserNotificationsEnabled &&
    !Capacitor.isNativePlatform() &&
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  );
}

function shouldPlayAlert(notification: RealtimeNotification) {
  const metadata = notificationMetadata(notification);
  return (
    metadata.urgency === "high" ||
    metadata.priority === "urgent" ||
    metadata.priority === "emergency" ||
    notification.action_url?.includes("telemedicine") ||
    notification.title.toLowerCase().includes("appointment") ||
    notification.title.toLowerCase().includes("telemedicine")
  );
}

function notificationMetadata(notification: RealtimeNotification): Record<string, string> {
  const value = (notification as unknown as { metadata?: unknown }).metadata;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string>;
}

function openNotificationTarget(notification: RealtimeNotification) {
  const target = notification.action_url || notificationMetadata(notification).action_url;
  if (target) {
    window.location.href = target;
  }
}

export function NotificationRuntime() {
  const { user } = useAuth();
  const { data: patientProfile } = usePatientProfile();
  const profileMeta = getPatientProfileMeta(patientProfile?.insurance_info);
  const browserNotificationsEnabled =
    profileMeta.notification_settings.browser_notifications === null
      ? false
      : profileMeta.notification_settings.browser_notifications;
  const foregroundAlertsEnabled = profileMeta.notification_settings.browser_notifications !== false;

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notification-runtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as RealtimeNotification;
          const showSystemNotification = canShowWebNotification(browserNotificationsEnabled);
          const hasAction = Boolean(notification.action_url || notificationMetadata(notification).action_url);

          if (!foregroundAlertsEnabled) return;

          toast({
            title: notification.title || "Neo Synapse",
            description: notification.body,
            action: hasAction ? (
              <ToastAction altText="Open notification" onClick={() => openNotificationTarget(notification)}>
                Open
              </ToastAction>
            ) : undefined,
          });

          if (shouldPlayAlert(notification)) {
            vibrateNotification();
            void playNotificationTone();
          }

          if (!showSystemNotification) return;

          const webNotification = new Notification(notification.title || "Neo Synapse", {
            body: notification.body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: notification.id,
            data: { action_url: notification.action_url },
          });

          webNotification.onclick = () => {
            window.focus();
            const target = notification.action_url;
            if (target) {
              window.location.href = target;
            }
            webNotification.close();
          };

          window.setTimeout(() => webNotification.close(), 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [browserNotificationsEnabled, foregroundAlertsEnabled, user?.id]);

  return null;
}
