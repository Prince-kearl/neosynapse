import { Bell, Check, ChevronRight, Loader2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNotificationFeed } from "@/shared/hooks/useNotifications";

type NotificationCenterPageProps = {
  heading: string;
  subheading: string;
  settingsPath: string;
};

export function NotificationCenterPage({ heading, subheading, settingsPath }: NotificationCenterPageProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingRead,
    isMarkingAllRead,
  } = useNotificationFeed();

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <h1 className="font-display text-xl font-bold">{heading}</h1>
            <p className="text-xs text-muted-foreground">{subheading}</p>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-primary" />
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold mb-1">Notification Center</h2>
            <p className="text-sm text-muted-foreground">
              New alerts, reminders, and system updates appear here in real time.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0 || isMarkingAllRead}
            className="min-h-11 w-full text-sm font-semibold text-secondary-foreground disabled:text-secondary-foreground sm:min-h-9 sm:w-auto"
          >
            {isMarkingAllRead ? "Updating..." : "Mark all read"}
          </Button>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Settings className="w-5 h-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium">Notification Preferences</p>
              <p className="text-sm text-muted-foreground">Manage channels and alert types</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(settingsPath)} className="w-full sm:w-auto">
            Open Settings <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </section>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                You are all caught up. New activity will show here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.is_read ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Unread
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground break-words">{notification.body}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(notification.created_at)}</p>
                    {notification.action_url ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => navigate(notification.action_url!)}
                      >
                        Open related page
                      </Button>
                    ) : null}
                  </div>
                  {!notification.is_read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => markAsRead(notification.id)}
                      disabled={isMarkingRead}
                    >
                      <Check className="w-4 h-4 mr-1" /> Mark read
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
