import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Mail, Building2, ShieldCheck, 
  FileCode, ScrollText, Settings, ChevronLeft, ChevronRight, Activity, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Invitations", url: "/admin/invitations", icon: Mail },
  { title: "Facilities", url: "/admin/facilities", icon: Building2 },
  { title: "Roles", url: "/admin/roles", icon: ShieldCheck },
  { title: "Quick Actions", url: "/admin/quick-actions", icon: SlidersHorizontal },
  { title: "Templates", url: "/admin/templates", icon: FileCode },
  { title: "Audit Log", url: "/admin/audit", icon: ScrollText },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => path === "/admin/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <aside className={cn("hidden lg:flex h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 shadow-sidebar sticky top-0", collapsed ? "w-20" : "w-64")}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-destructive" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="font-display text-xl font-bold text-foreground">Neo Synapse</h1>
              <p className="text-xs text-muted-foreground">Admin Console</p>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink key={item.title} to={item.url} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group", isActive(item.url) ? "bg-sidebar-primary text-sidebar-primary-foreground glow-green" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
            <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-200", !isActive(item.url) && "group-hover:scale-110")} />
            {!collapsed && <span className="font-medium animate-fade-in truncate">{item.title}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <NavLink to="/admin/settings" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200", isActive("/admin/settings") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium truncate">Settings</span>}
        </NavLink>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center mt-4 text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5 mr-2" /><span>Collapse</span></>}
        </Button>
      </div>
    </aside>
  );
}
