import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { Button } from "@/components/ui/button";

type AdminReturnToDashboardProps = {
  portalName: "patient" | "professional";
};

export function AdminReturnToDashboard({ portalName }: AdminReturnToDashboardProps) {
  const location = useLocation();
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading || !isAdmin || location.pathname.startsWith("/admin")) {
    return null;
  }

  const portalLabel = portalName === "patient" ? "Patient Portal" : "Professional Portal";

  return (
    <div className="sticky top-0 z-30 border-b border-primary/20 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Admin viewing {portalLabel}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              You can review this portal, then return to system management at any time.
            </p>
          </div>
        </div>
        <Button size="sm" className="h-10 shrink-0 rounded-xl font-semibold" asChild>
          <Link to="/admin/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Admin Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
