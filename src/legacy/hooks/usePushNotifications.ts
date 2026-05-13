import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPushPermission,
  isPushSupported as isPushSupportedUnified,
  requestAndRegisterNativePush,
  requestPushPermission,
} from "@/mobile/pushNotifications";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = isPushSupportedUnified();
    setIsSupported(supported);

    if (!supported) return;

    void getPushPermission().then((p) => setPermission(p));
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn("Push notifications are not supported in this browser");
      return false;
    }

    try {
      const result = await requestPushPermission();
      setPermission(result);

      if (result === "granted") {
        await requestAndRegisterNativePush(user?.id);
      }

      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported, user?.id]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window) || permission !== "granted") {
      console.warn("Cannot send notification: not supported or permission not granted");
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
      return null;
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    permission,
    isEnabled: permission === "granted",
    requestPermission,
    sendNotification,
  };
};
