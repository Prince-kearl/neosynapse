import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/shared/services/healthcare";

export type AdminSettings = {
  systemAlerts: boolean;
  newRegistrations: boolean;
  auditLoggingVisible: boolean;
  dataRetentionDays: string;
  theme?: string;
  language?: string;
  raw: Record<string, unknown>;
};

export const normalizeAdminSettings = (settings: Record<string, unknown> | null | undefined): AdminSettings => {
  const raw = settings ?? {};
  return {
    systemAlerts: raw.system_alerts !== false,
    newRegistrations: raw.new_registrations === true,
    auditLoggingVisible: raw.audit_logging_visible !== false,
    dataRetentionDays: typeof raw.data_retention_days === "string" ? raw.data_retention_days : "90",
    theme: typeof raw.theme === "string" ? raw.theme : undefined,
    language: typeof raw.language === "string" ? raw.language : undefined,
    raw,
  };
};

export function useAdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await profileService.getMyProfile(user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const settings = normalizeAdminSettings(profileQuery.data?.settings_json as Record<string, unknown> | null | undefined);

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await profileService.updateSettings(user.id, nextSettings);
      if (error) throw error;
      return nextSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    settings,
    saveSettingsMutation,
  };
}
