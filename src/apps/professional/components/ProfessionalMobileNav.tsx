import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Video, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", url: "/professional/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/professional/patients", icon: Users },
  { title: "Calls", url: "/professional/telemedicine", icon: Video },
  { title: "Notes", url: "/professional/notes", icon: PenTool },
];

export function ProfessionalMobileNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/professional/dashboard") return location.pathname === "/professional/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
      <div className="safe-area-bottom flex items-center justify-between px-2 py-2">
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
      </div>
    </nav>
  );
}
