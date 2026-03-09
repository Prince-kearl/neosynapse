import { Users, Search, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

// TODO: Fetch real assigned patients from encounters/appointments
const mockPatients = [
  { id: "1", name: "Ama Mensah", age: 45, lastVisit: "2026-03-01", conditions: ["Hypertension", "Diabetes"] },
  { id: "2", name: "Kofi Asante", age: 32, lastVisit: "2026-02-28", conditions: ["Asthma"] },
  { id: "3", name: "Efua Owusu", age: 28, lastVisit: "2026-02-25", conditions: ["Pregnancy monitoring"] },
  { id: "4", name: "Kwame Boateng", age: 55, lastVisit: "2026-02-20", conditions: ["Heart disease", "Hypertension"] },
];

export default function ProfessionalPatients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredPatients = mockPatients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">My Patients</h1>
          <p className="text-muted-foreground">View and manage your assigned patients</p>
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
        <div className="space-y-4">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => navigate(`/professional/patients/${patient.id}`)}
              className="w-full bg-card rounded-2xl p-4 shadow-food-card border border-border text-left hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {patient.age} years • Last visit: {new Date(patient.lastVisit).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {patient.conditions.slice(0, 2).map((c) => (
                        <span key={c} className="text-xs bg-muted px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-food-card text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No patients found</p>
          </div>
        )}
      </div>
    </div>
  );
}
