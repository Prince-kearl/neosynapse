import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, Heart, User, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveOrders } from "@/hooks/useActiveOrders";

const navItems = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Explore", url: "/explore", icon: Search },
  { title: "Orders", url: "/orders", icon: ShoppingBag, showBadge: true },
  { title: "Saved", url: "/saved", icon: Heart },
  { title: "Profile", url: "/profile", icon: User },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { activeOrderCount } = useActiveOrders();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around py-2 px-2 safe-area-bottom">
        {navItems.map((item) => {
          const active = isActive(item.url);
          const showBadge = item.showBadge && activeOrderCount > 0;
          
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-200 relative",
                  active && "bg-primary/10"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "scale-110")} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                    {activeOrderCount > 9 ? "9+" : activeOrderCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
