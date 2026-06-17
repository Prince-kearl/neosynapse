import { ChevronDown, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DoctorSelectItem {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  available: boolean;
}

interface DoctorSelectProps {
  doctors: DoctorSelectItem[];
  specialties: string[];
  selectedSpecialty: string;
  selectedDoctor: string | null;
  isLoading: boolean;
  error: unknown;
  onSpecialtyChange: (value: string) => void;
  onDoctorChange: (value: string | null) => void;
}

export function DoctorSelect({
  doctors,
  specialties,
  selectedSpecialty,
  selectedDoctor,
  isLoading,
  error,
  onSpecialtyChange,
  onDoctorChange,
}: DoctorSelectProps) {
  const filteredDoctors = selectedSpecialty ? doctors.filter((doctor) => doctor.specialty === selectedSpecialty) : doctors;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Choose a doctor</h2>
          <p className="text-sm text-muted-foreground">Filter by specialty and pick the provider that best fits your need.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialty-select">Specialty</Label>
          <Select value={selectedSpecialty} onValueChange={onSpecialtyChange}>
            <SelectTrigger id="specialty-select" className="w-56">
              <SelectValue placeholder="Select specialty" />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Loading available doctors…</div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Unable to load doctors. Please try again.</div>
      ) : filteredDoctors.length === 0 ? (
        <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">No doctors are available for this specialty right now.</div>
      ) : (
        <div className="grid gap-3">
          {filteredDoctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              onClick={() => onDoctorChange(doctor.id)}
              className={cn(
                "group rounded-3xl border p-5 text-left transition",
                selectedDoctor === doctor.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/20",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                </div>
                <div className="rounded-2xl border px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                  {doctor.available ? "Available" : "Unavailable"}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{doctor.rating.toFixed(1)} / 5.0 rating</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
