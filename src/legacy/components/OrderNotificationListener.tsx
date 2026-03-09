import { useOrderNotifications } from "@/hooks/useOrderNotifications";

export const OrderNotificationListener = () => {
  useOrderNotifications();
  return null;
};
