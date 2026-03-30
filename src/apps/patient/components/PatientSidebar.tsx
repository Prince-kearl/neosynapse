import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Stethoscope,
  CalendarCheck,
  Video,
  FileText,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/patient/dashboard", icon: LayoutDashboard },
  { title: "AI Assistant", url: "/patient/ai-assistant", icon: Bot },
  { title: "Symptom Checker", url: "/patient/symptom-checker", icon: Stethoscope },
  { title: "Appointments", url: "/patient/appointments", icon: CalendarCheck },
  { title: "Telemedicine", url: "/patient/telemedicine", icon: Video },
  { title: "Reports", url: "/patient/reports", icon: FileText },
];

const bottomItems = [
  { title: "Profile", url: "/patient/profile", icon: User },
  { title: "Settings", url: "/patient/settings", icon: Settings },
];

export function PatientSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/patient/dashboard") return location.pathname === "/patient/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto bg-sidebar border-r border-sidebar-border shadow-sidebar transition-all duration-300 lg:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 glow-green">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="font-display text-xl font-bold text-foreground">
                Neo Synapse
              </h1>
              <p className="text-xs text-muted-foreground">Patient Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
              isActive(item.url)
                ? "bg-sidebar-primary text-sidebar-primary-foreground glow-green"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                !isActive(item.url) && "group-hover:scale-110"
              )}
            />
            {!collapsed && (
              <span className="font-medium animate-fade-in truncate">{item.title}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {bottomItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
              isActive(item.url)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                !isActive(item.url) && "group-hover:scale-110"
              )}
            />
            {!collapsed && (
              <span className="font-medium animate-fade-in truncate">{item.title}</span>
            )}
          </NavLink>
        ))}

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center mt-4 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
