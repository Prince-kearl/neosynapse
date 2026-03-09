import { Video, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ProfessionalTelemedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch active telemedicine encounters waiting for this professional
  const { data: waitingEncounters = [], isLoading } = useQuery({
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
  });

  // Fetch patient names
  const patientIds = [...new Set(waitingEncounters.map((e) => e.patient_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["pro-tele-profiles", patientIds],
    queryFn: async () => {
      if (patientIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, full_name")
        .in("user_id", patientIds);
      return data || [];
    },
    enabled: patientIds.length > 0,
  });

  const getPatientName = (id: string) => {
    const p = profiles.find((pr) => pr.user_id === id);
    return p?.full_name || p?.display_name || "Patient";
  };

  const getWaitTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "Just now";
    return `${diff} min`;
  };

  // TODO: Implement WebRTC join logic for doctor side
  const handleJoinCall = (encounterId: string) => {
    console.log("Joining encounter:", encounterId);
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">Telemedicine Console</h1>
          <p className="text-muted-foreground">Manage video consultations with patients</p>
        </div>

        {/* Waiting Patients */}
        <section className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Waiting Patients
            </h2>
            <Badge variant="outline">{waitingEncounters.length} waiting</Badge>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : waitingEncounters.length > 0 ? (
            <div className="space-y-3">
              {waitingEncounters.map((enc) => (
                <div key={enc.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {getPatientName(enc.patient_id).charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{getPatientName(enc.patient_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {enc.status === "in_progress" ? "In progress" : "Waiting"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {getWaitTime(enc.created_at)}
                    </span>
                    <Badge variant="outline" className={
                      enc.status === "in_progress" ? "border-primary/50 text-primary" : "border-yellow-500/50 text-yellow-500"
                    }>
                      {enc.status.replace("_", " ")}
                    </Badge>
                    <Button onClick={() => handleJoinCall(enc.id)}>
                      <Video className="w-4 h-4 mr-2" />
                      Join Call
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No patients waiting</p>
              <p className="text-xs text-muted-foreground mt-1">
                Patients will appear here when they start a telemedicine session assigned to you.
              </p>
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-muted/50 rounded-2xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> When you join a call, the patient's video feed will appear.
            Ensure your camera and microphone are enabled. If recording consent was granted,
            the consultation will be transcribed for clinical documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
