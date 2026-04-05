import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type UserNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: "general" | "appointment" | "clinical" | "system" | "security";
  action_url: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const feedKey = (userId?: string) => ["user-notifications", userId];
const unreadKey = (userId?: string) => ["user-notifications-unread", userId];

function useNotificationsRealtimeSync(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: feedKey(userId) });
          queryClient.invalidateQueries({ queryKey: unreadKey(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const userId = user?.id;

  useNotificationsRealtimeSync(userId);

  const query = useQuery({
    queryKey: unreadKey(userId),
    queryFn: async () => {
      const db = supabase as any;
      const { count, error } = await db
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  return {
    unreadCount: query.data || 0,
    isLoading: query.isLoading,
  };
}

export function useNotificationFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useNotificationsRealtimeSync(userId);

  const feedQuery = useQuery({
    queryKey: feedKey(userId),
    queryFn: async (): Promise<UserNotification[]> => {
      const db = supabase as any;
      const { data, error } = await db
        .from("user_notifications")
        .select("id, user_id, title, body, category, action_url, metadata, is_read, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const unreadQuery = useQuery({
    queryKey: unreadKey(userId),
    queryFn: async () => {
      const db = supabase as any;
      const { count, error } = await db
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const db = supabase as any;
      const { error } = await db
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKey(userId) });
      queryClient.invalidateQueries({ queryKey: unreadKey(userId) });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const db = supabase as any;
      const { error } = await db
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKey(userId) });
      queryClient.invalidateQueries({ queryKey: unreadKey(userId) });
    },
  });

  return {
    notifications: feedQuery.data || [],
    isLoading: feedQuery.isLoading,
    unreadCount: unreadQuery.data || 0,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingRead: markAsRead.isPending,
    isMarkingAllRead: markAllAsRead.isPending,
  };
}
