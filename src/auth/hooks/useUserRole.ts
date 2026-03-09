import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole, Profile } from "@/shared/types/healthcare";

export function useUserRole() {
  const { user } = useAuth();

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as Profile | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all roles from user_roles table (multi-role support)
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async (): Promise<UserRole[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }

      return (data || []).map((r) => r.role as UserRole);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const roles = userRoles || [];
  // Primary role for backward compatibility (priority: admin > professional > patient)
  const role: UserRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("professional")
    ? "professional"
    : roles.includes("patient")
    ? "patient"
    : null;

  const isLoading = profileLoading || rolesLoading;

  return {
    role,
    roles, // All roles for multi-role checks
    profile,
    isLoading,
    isPatient: roles.includes("patient"),
    isProfessional: roles.includes("professional"),
    isAdmin: roles.includes("admin"),
  };
}
