import { Link } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadNotificationsCount } from "@/shared/hooks/useNotifications";

type MobileTopActionsProps = {
  profilePath: string;
  notificationsPath: string;
};

export function MobileTopActions({ profilePath, notificationsPath }: MobileTopActionsProps) {
  const { unreadCount } = useUnreadNotificationsCount();

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur lg:hidden">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          asChild
          aria-label="Notifications"
        >
          <Link to={notificationsPath}>
            <span className="relative inline-flex">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-primary/10"
          asChild
          aria-label="Profile"
        >
          <Link to={profilePath}>
            <User className="h-4 w-4 text-primary" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
