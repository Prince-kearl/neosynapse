import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  available: boolean;
}

interface DoctorCardProps {
  doctor: Doctor;
  selected: boolean;
  onSelect: () => void;
}

export function DoctorCard({ doctor, selected, onSelect }: DoctorCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!doctor.available}
      className={`bg-card rounded-2xl p-4 shadow-food-card text-left transition-all ${
        selected
          ? "ring-2 ring-primary glow-green"
          : doctor.available
          ? "hover:border-primary/50 border border-transparent"
          : "opacity-50 cursor-not-allowed"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{doctor.name}</p>
          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
        </div>
        <Badge
          className={
            doctor.available
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-muted text-muted-foreground"
          }
        >
          {doctor.available ? "Available" : "Busy"}
        </Badge>
      </div>
    </button>
  );
}
