import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { consentService } from "@/shared/services/healthcare";
import { CONSENT_TYPES } from "@/shared/types/healthcare";

/**
 * Check if user has given consent for AI medical advice.
 * Returns true only if at least one granted consent of type ai_medical_advice exists.
 */
export function useAIConsentCheck() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-consent", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await consentService.getForPatient(user.id);
      if (error) throw error;

      const aiConsents = Array.isArray(data)
        ? data.filter((c) => c.consent_type === CONSENT_TYPES.AI_MEDICAL_ADVICE)
        : [];

      // Return the latest granted consent, or null if none exist
      const grantedConsent = aiConsents.find((c) => c.granted);
      return grantedConsent || null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
