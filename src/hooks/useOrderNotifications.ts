import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { OrderStatus } from "@/types/database";

const statusMessages: Record<OrderStatus, { title: string; description: string; icon: string }> = {
  pending: {
    title: "Order Placed",
    description: "Your order has been received and is pending confirmation.",
    icon: "📋",
  },
  confirmed: {
    title: "Order Confirmed!",
    description: "The vendor has confirmed your order and will start preparing it soon.",
    icon: "🎉",
  },
  preparing: {
    title: "Cooking in Progress",
    description: "Your delicious meal is being prepared!",
    icon: "👨‍🍳",
  },
  ready: {
    title: "Order Ready!",
    description: "Your order is ready for pickup or delivery.",
    icon: "🍽️",
  },
  delivered: {
    title: "Order Delivered",
    description: "Enjoy your meal! Thank you for ordering with ChowPoint.",
    icon: "✅",
  },
  cancelled: {
    title: "Order Cancelled",
    description: "Your order has been cancelled.",
    icon: "❌",
  },
};

// Helper to send browser push notification
const sendBrowserNotification = (title: string, body: string, tag: string, requireInteraction: boolean) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  
  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag,
      requireInteraction,
    });
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const useOrderNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime changes on orders table
    const channel = supabase
      .channel(`orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newOrder = payload.new as { id: string; status: OrderStatus };
          const oldOrder = payload.old as { id: string; status: OrderStatus };

          // Only notify if status actually changed
          if (oldOrder.status !== newOrder.status) {
            const message = statusMessages[newOrder.status];
            
            // Show in-app toast notification
            toast({
              title: `${message.icon} ${message.title}`,
              description: message.description,
              variant: newOrder.status === "cancelled" ? "destructive" : "default",
            });

            // Send browser push notification if permission granted
            sendBrowserNotification(
              `${message.icon} ${message.title}`,
              message.description,
              `order-${newOrder.id}`,
              newOrder.status === "ready"
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
