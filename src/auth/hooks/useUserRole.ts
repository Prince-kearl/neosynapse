import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole, Profile } from "@/shared/types/healthcare";

export function useUserRole() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const role: UserRole | null = profile?.role || null;

  return {
    role,
    profile,
    isLoading,
    isPatient: role === "patient",
    isProfessional: role === "professional",
    isAdmin: role === "admin",
  };
}
