import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole, Profile } from "@/shared/types/healthcare";

export function useUserRole() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-roles-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-roles", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
