import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Bot, Video, FileText, Stethoscope, CalendarCheck, User, Settings, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", url: "/patient/dashboard", icon: LayoutDashboard },
  { title: "AI", url: "/patient/ai-assistant", icon: Bot },
  { title: "Consult", url: "/patient/telemedicine", icon: Video },
];

const moreItems = [
  { title: "Appointments", url: "/patient/appointments", icon: CalendarCheck },
  { title: "Reports", url: "/patient/reports", icon: FileText },
  { title: "Profile", url: "/patient/profile", icon: User },
  { title: "Settings", url: "/patient/settings", icon: Settings },
];

export function PatientMobileNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/patient/dashboard") return location.pathname === "/patient/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
        <div className="safe-area-bottom relative flex items-center justify-between gap-1 px-2 py-2 max-[380px]:px-1 max-[380px]:py-1.5">
          {/* Left nav items */}
          {navItems.slice(0, 2).map((item) => {
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all duration-200 max-[380px]:px-1.5 max-[380px]:py-1.5",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn("rounded-xl p-1.5 transition-all duration-200 max-[380px]:p-1", active && "bg-primary/10")}>
                  <item.icon className={cn("h-5 w-5 max-[380px]:h-4 max-[380px]:w-4", active && "scale-110")} />
                </div>
                <span className="text-[10px] font-medium max-[380px]:text-[9px]">{item.title}</span>
              </NavLink>
            );
          })}

          {/* Center floating button - Symptom Checker */}
          <NavLink
            to="/patient/symptom-checker"
            className="-mt-6 flex flex-col items-center gap-1 max-[380px]:-mt-5"
          >
            <div className="glow-green flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-primary max-[380px]:h-12 max-[380px]:w-12">
              <Stethoscope className="h-6 w-6 text-primary-foreground max-[380px]:h-5 max-[380px]:w-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground max-[380px]:text-[9px]">Symptoms</span>
          </NavLink>

          {/* Right nav items */}
          {navItems.slice(2).map((item) => {
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all duration-200 max-[380px]:px-1.5 max-[380px]:py-1.5",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn("rounded-xl p-1.5 transition-all duration-200 max-[380px]:p-1", active && "bg-primary/10")}>
                  <item.icon className={cn("h-5 w-5 max-[380px]:h-4 max-[380px]:w-4", active && "scale-110")} />
                </div>
                <span className="text-[10px] font-medium max-[380px]:text-[9px]">{item.title}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground transition-all duration-200 hover:text-primary max-[380px]:px-1.5 max-[380px]:py-1.5"
          >
            <div className="rounded-xl p-1.5 transition-all duration-200 max-[380px]:p-1 hover:bg-primary/10">
              <MoreHorizontal className="h-5 w-5 max-[380px]:h-4 max-[380px]:w-4" />
            </div>
            <span className="text-[10px] font-medium max-[380px]:text-[9px]">More</span>
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
