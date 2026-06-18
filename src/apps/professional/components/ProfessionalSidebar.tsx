import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Video,
  FileText,
  PenTool,
  FileCheck,
  CalendarCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";

const navItems = [
  { title: "Dashboard", url: "/professional/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/professional/patients", icon: Users },
  { title: "Encounters", url: "/professional/encounters", icon: ClipboardList },
  { title: "Appointments", url: "/professional/appointments", icon: CalendarCheck },
  { title: "Telemedicine", url: "/professional/telemedicine", icon: Video },
  { title: "Transcripts", url: "/professional/transcripts", icon: FileText },
  { title: "Clinical Notes", url: "/professional/notes", icon: PenTool },
  { title: "Reports", url: "/professional/reports", icon: FileCheck },
];

const bottomItems = [
  { title: "Settings", url: "/professional/settings", icon: Settings },
];

export function ProfessionalSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/professional/dashboard") return location.pathname === "/professional/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 shadow-sidebar sticky top-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <BrandMark />
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="font-display text-xl font-bold text-foreground">Neo Synapse</h1>
              <p className="text-xs text-muted-foreground">Professional Portal</p>
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
                ? "bg-accent text-accent-foreground"
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
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium truncate">{item.title}</span>}
          </NavLink>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center mt-4 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : (
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
