import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  BellDot,
  Building2,
  FileCode,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const navItems = [
  { title: "Home", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Invites", url: "/admin/invitations", icon: Mail },
  { title: "Sites", url: "/admin/facilities", icon: Building2 },
];

const moreItems = [
  { title: "Roles", url: "/admin/roles", icon: ShieldCheck },
  { title: "Quick Actions", url: "/admin/quick-actions", icon: SlidersHorizontal },
  { title: "Templates", url: "/admin/templates", icon: FileCode },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Msg Templates", url: "/admin/notification-templates", icon: BellDot },
  { title: "Audit Log", url: "/admin/audit", icon: ScrollText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminMobileNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin/dashboard") return location.pathname === "/admin/dashboard";
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreItems.some((item) => isActive(item.url));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
      <div className="safe-area-bottom flex items-center justify-between gap-1 px-2 py-2 max-[380px]:px-1">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn("rounded-lg p-1.5 transition-all duration-200", active && "bg-primary/10")}>
                <item.icon className={cn("h-5 w-5", active && "scale-110")} />
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-all duration-200",
            isMoreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div className={cn("rounded-lg p-1.5 transition-all duration-200", isMoreActive && "bg-primary/10")}>
            <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "scale-110")} />
          </div>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>

      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-4">
          <DialogHeader>
            <DialogTitle>More pages</DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            {moreItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50 hover:bg-primary/5",
                  isActive(item.url) ? "border-primary bg-primary/10 text-primary" : "text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </NavLink>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
