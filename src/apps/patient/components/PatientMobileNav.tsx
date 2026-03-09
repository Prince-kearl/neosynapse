import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Bot, Video, FileText, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", url: "/patient/dashboard", icon: LayoutDashboard },
  { title: "AI", url: "/patient/ai-assistant", icon: Bot },
  { title: "Consult", url: "/patient/telemedicine", icon: Video },
  { title: "Reports", url: "/patient/reports", icon: FileText },
];

export function PatientMobileNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/patient/dashboard") return location.pathname === "/patient/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around py-2 px-2 safe-area-bottom relative">
        {/* Left nav items */}
        {navItems.slice(0, 2).map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn("p-1.5 rounded-xl transition-all duration-200", active && "bg-primary/10")}>
                <item.icon className={cn("w-5 h-5", active && "scale-110")} />
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}

        {/* Center floating button - Symptom Checker */}
        <NavLink
          to="/patient/symptom-checker"
          className="flex flex-col items-center gap-1 -mt-6"
        >
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center glow-green border-4 border-card">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Symptoms</span>
        </NavLink>

        {/* Right nav items */}
        {navItems.slice(2).map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn("p-1.5 rounded-xl transition-all duration-200", active && "bg-primary/10")}>
                <item.icon className={cn("w-5 h-5", active && "scale-110")} />
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
