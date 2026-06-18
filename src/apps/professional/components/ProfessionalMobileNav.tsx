import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  CalendarCheck,
  ClipboardList,
  FileCheck,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  PenTool,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const navItems = [
  { title: "Home", url: "/professional/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/professional/patients", icon: Users },
  { title: "Calls", url: "/professional/telemedicine", icon: Video },
  { title: "Notes", url: "/professional/notes", icon: PenTool },
];

const moreItems = [
  { title: "Encounters", url: "/professional/encounters", icon: ClipboardList },
  { title: "Appointments", url: "/professional/appointments", icon: CalendarCheck },
  { title: "Transcripts", url: "/professional/transcripts", icon: FileText },
  { title: "Reports", url: "/professional/reports", icon: FileCheck },
  { title: "Settings", url: "/professional/settings", icon: Settings },
];

export function ProfessionalMobileNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/professional/dashboard") return location.pathname === "/professional/dashboard";
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
