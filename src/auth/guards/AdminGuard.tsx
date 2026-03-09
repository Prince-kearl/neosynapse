import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (role !== "admin") {
    // Redirect unauthorized users
    if (role === "patient") {
      return <Navigate to="/patient/dashboard" replace />;
    }
    if (role === "professional") {
      return <Navigate to="/professional/dashboard" replace />;
    }
    // Unknown role
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <>{children}</>;
}
