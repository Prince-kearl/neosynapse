/**
 * Healthcare Query Hooks
 *
 * Reusable React Query hooks for healthcare entities.
 * These wrap the service layer with proper caching, loading, and error states.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  profileService,
  patientProfileService,
  medicalHistoryService,
  professionalProfileService,
  facilityService,
  appointmentService,
  encounterService,
  triageService,
  consentService,
  transcriptService,
  clinicalNoteService,
  medicalReportService,
  auditLogService,
} from "@/shared/services/healthcare";

// ─── Profile Hooks ──────────────────────────────────────────────

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await profileService.getMyProfile(user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePatientProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await patientProfileService.get(user!.id);
      if (error && (error as any).code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMedicalHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["medical-history", user?.id],
    queryFn: async () => {
      const { data, error } = await medicalHistoryService.get(user!.id);
      if (error && (error as any).code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMedicalHistoryFiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["medical-history-files", user?.id],
    queryFn: async () => {
      const { data, error } = await medicalHistoryService.listFiles(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useMedicalHistoryForAssignedPatient(patientUserId?: string) {
  return useQuery({
    queryKey: ["medical-history-assigned", patientUserId],
    queryFn: async () => {
      const { data, error } = await medicalHistoryService.getForAssignedPatient(patientUserId!);
      if (error && (error as any).code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!patientUserId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMedicalHistoryFilesForAssignedPatient(patientUserId?: string) {
  return useQuery({
    queryKey: ["medical-history-files-assigned", patientUserId],
    queryFn: async () => {
      const { data, error } = await medicalHistoryService.listFilesForAssignedPatient(patientUserId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!patientUserId,
    staleTime: 60 * 1000,
  });
}

export function useProfessionalProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["professional-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await professionalProfileService.get(user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Facility Hooks ─────────────────────────────────────────────

export function useFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: async () => {
      const { data, error } = await facilityService.getAll();
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Patient Data Hooks ─────────────────────────────────────────

export function useMyAppointments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await appointmentService.getForPatient(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

/** Patient dashboard: upcoming appointments (limited) */
export function useUpcomingAppointments(limit = 3) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["upcoming-appointments", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", user!.id)
        .in("status", ["pending", "confirmed"])
        .order("scheduled_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useMyEncounters() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-encounters", user?.id],
    queryFn: async () => {
      const { data, error } = await encounterService.getForPatient(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useMyTriageSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-triage-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await triageService.getForPatient(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

/** Patient dashboard: recent triage (limited) */
export function useRecentTriage(limit = 1) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recent-triage", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("triage_sessions")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useMyConsents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-consents", user?.id],
    queryFn: async () => {
      const { data, error } = await consentService.getForPatient(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useMyReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await medicalReportService.getForPatient(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

/** Patient dashboard: recent reports (limited) */
export function useRecentReports(limit = 2) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recent-reports", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_reports")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

// ─── Professional Data Hooks ────────────────────────────────────

export function useProfessionalEncounters() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-encounters", user?.id],
    queryFn: async () => {
      const { data, error } = await encounterService.getForProfessional(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useProfessionalAppointments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await appointmentService.getForProfessional(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useProfessionalTranscripts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-transcripts", user?.id],
    queryFn: async () => {
      const { data, error } = await transcriptService.getForProfessional(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useProfessionalNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-clinical-notes", user?.id],
    queryFn: async () => {
      const { data, error } = await clinicalNoteService.getForProfessional(user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

/** Professional: telemedicine encounters (pending/in_progress) */
export function useProfessionalTelemedicine() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-tele-waiting", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encounters")
        .select("*")
        .eq("professional_id", user!.id)
        .eq("encounter_type", "telemedicine")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
}

/** Professional: assigned patients derived from encounters */
export function useAssignedPatients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-patients", user?.id],
    queryFn: async () => {
      const { data: encounters, error } = await supabase
        .from("encounters")
        .select("id, patient_id, encounter_type, status, created_at")
        .eq("professional_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!encounters || encounters.length === 0) return [];

      const patientMap = new Map<string, {
        patient_id: string;
        lastEncounterId: string;
        lastEncounter: string;
        encounterCount: number;
        lastType: string;
      }>();

      encounters.forEach((enc) => {
        if (!patientMap.has(enc.patient_id)) {
          patientMap.set(enc.patient_id, {
            patient_id: enc.patient_id,
            lastEncounterId: enc.id,
            lastEncounter: enc.created_at,
            encounterCount: 1,
            lastType: enc.encounter_type,
          });
        } else {
          patientMap.get(enc.patient_id)!.encounterCount += 1;
        }
      });

      const patientIds = Array.from(patientMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, full_name, avatar_url")
        .in("user_id", patientIds);

      return Array.from(patientMap.values()).map((p) => {
        const prof = profiles?.find((pr) => pr.user_id === p.patient_id);
        return {
          ...p,
          name: prof?.full_name || prof?.display_name || "Unknown Patient",
          avatar_url: prof?.avatar_url || null,
        };
      });
    },
    enabled: !!user,
  });
}

/** Professional: medical reports for their encounters */
export function useProfessionalReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-reports", user?.id],
    queryFn: async () => {
      const { data: encounters, error: encError } = await supabase
        .from("encounters")
        .select("id, patient_id")
        .eq("professional_id", user!.id);
      if (encError) throw encError;
      if (!encounters || encounters.length === 0) return [];

      const encounterIds = encounters.map((e) => e.id);
      const { data, error } = await supabase
        .from("medical_reports")
        .select("*")
        .in("encounter_id", encounterIds)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      const patientIds = [...new Set((data || []).map((r) => r.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, full_name")
        .in("user_id", patientIds);

      return (data || []).map((report) => ({
        ...report,
        patientName:
          profiles?.find((p) => p.user_id === report.patient_id)?.full_name ||
          profiles?.find((p) => p.user_id === report.patient_id)?.display_name ||
          "Patient",
      }));
    },
    enabled: !!user,
  });
}

// ─── Admin Data Hooks ───────────────────────────────────────────

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await profileService.getAllProfiles();
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await auditLogService.getAll();
      if (error) throw error;
      return data || [];
    },
  });
}

// ─── Utility: Resolve user IDs to display names ────────────────

export function useProfileNames(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  return useQuery({
    queryKey: ["profile-names", uniqueIds.sort().join(",")],
    queryFn: async () => {
      if (uniqueIds.length === 0) return {};
      const { data } = await profileService.getByUserIds(uniqueIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p) => {
        map[p.user_id] = p.full_name || p.display_name || "Unknown";
      });
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}
