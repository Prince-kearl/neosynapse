import type { UserRole } from "@/shared/types/healthcare";

export const getDefaultRouteForRole = (role: UserRole | null | undefined) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "professional") return "/professional/dashboard";
  return "/patient/dashboard";
};

export const isRouteAllowedForPrimaryRole = (role: UserRole | null | undefined, pathname: string | null | undefined) => {
  if (!pathname || !role) return false;
  if (role === "admin") return pathname.startsWith("/admin");
  if (role === "professional") return pathname.startsWith("/professional");
  if (role === "patient") return pathname.startsWith("/patient");
  return false;
};
