import type { UserRole } from "@/shared/types/healthcare";

export const ROLE_PRIORITY: UserRole[] = ["admin", "professional", "patient"];

export const getPrimaryRoleFromRoles = (
  roles: Array<UserRole | string | null | undefined>,
  fallbackRole?: UserRole | string | null
): UserRole | null => {
  const normalized = new Set(roles.filter(Boolean) as string[]);

  for (const role of ROLE_PRIORITY) {
    if (normalized.has(role)) return role;
  }

  return ROLE_PRIORITY.includes(fallbackRole as UserRole) ? (fallbackRole as UserRole) : null;
};

export const getRoleLabel = (role: UserRole | null | undefined) => {
  if (role === "admin") return "Admin Account";
  if (role === "professional") return "Professional Account";
  return "Patient Account";
};
