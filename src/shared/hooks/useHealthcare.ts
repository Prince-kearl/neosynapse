/**
 * Healthcare Query Hooks
 *
 * Reusable React Query hooks for healthcare entities.
 * These wrap the service layer with proper caching, loading, and error states.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  profileService,
  patientProfileService,
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
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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

// ─── Admin Data Hooks ───────────────────────────────────────────
// TODO: These require admin-level RLS policies (SELECT all) to function properly

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await auditLogService.getOwn();
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
