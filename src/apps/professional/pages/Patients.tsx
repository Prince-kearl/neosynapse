import { Users, Search, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAssignedPatients } from "@/shared/hooks/useHealthcare";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

export default function ProfessionalPatients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: patients = [], isLoading } = useAssignedPatients();

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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/professional/encounters?encounterId=${patient.lastEncounterId}`)}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            icon={Users}
            title={search ? "No patients matching your search" : "No patients assigned yet"}
            description="Patients will appear here once encounters are created."
            compact
          />
        )}
      </div>
    </div>
  );
}
