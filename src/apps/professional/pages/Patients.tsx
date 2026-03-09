import { Users, Search, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfessionalPatients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Fetch distinct patients from encounters assigned to this professional
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["pro-patients", user?.id],
    queryFn: async () => {
      // Get distinct patient IDs from encounters
      const { data: encounters, error } = await supabase
        .from("encounters")
        .select("patient_id, encounter_type, status, created_at")
        .eq("professional_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!encounters || encounters.length === 0) return [];

      // Group by patient_id to get unique patients with their last encounter
      const patientMap = new Map<string, {
        patient_id: string;
        lastEncounter: string;
        encounterCount: number;
        lastType: string;
      }>();

      encounters.forEach((enc) => {
        if (!patientMap.has(enc.patient_id)) {
          patientMap.set(enc.patient_id, {
            patient_id: enc.patient_id,
            lastEncounter: enc.created_at,
            encounterCount: 1,
            lastType: enc.encounter_type,
          });
        } else {
          const existing = patientMap.get(enc.patient_id)!;
          existing.encounterCount += 1;
        }
      });

      // Fetch profile info for these patients
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
          avatar_url: prof?.avatar_url,
        };
      });
    },
    enabled: !!user,
  });

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">My Patients</h1>
          <p className="text-muted-foreground">Patients assigned to you through encounters</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

        {/* Patient List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="space-y-3">
            {filteredPatients.map((patient) => (
              <div
                key={patient.patient_id}
                className="bg-card rounded-2xl p-4 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-lg">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {patient.encounterCount} encounter{patient.encounterCount !== 1 ? "s" : ""} • Last: {new Date(patient.lastEncounter).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">{patient.lastType}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/professional/encounters`)}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 text-center border border-border">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No patients matching your search" : "No patients assigned yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Patients will appear here once encounters are created.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
