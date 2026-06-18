import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { professionalProfileService } from "@/shared/services/healthcare";

export type ProfessionalSettings = {
  patientAlerts: boolean;
  activityLoggingVisible: boolean;
  theme?: string;
  language?: string;
  raw: Record<string, unknown>;
};

export const normalizeProfessionalSettings = (settings: Record<string, unknown> | null | undefined): ProfessionalSettings => {
  const raw = settings ?? {};
  return {
    patientAlerts: raw.patient_alerts !== false,
    activityLoggingVisible: raw.activity_logging_visible !== false,
    theme: typeof raw.theme === "string" ? raw.theme : undefined,
    language: typeof raw.language === "string" ? raw.language : undefined,
    raw,
  };
};

export function useProfessionalSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["pro-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await professionalProfileService.get(user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const settings = normalizeProfessionalSettings(profileQuery.data?.settings_json as Record<string, unknown> | null | undefined);

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await professionalProfileService.updateSettings(user.id, nextSettings);
      if (error) throw error;
      return nextSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pro-profile", user?.id] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    settings,
    saveSettingsMutation,
  };
}
