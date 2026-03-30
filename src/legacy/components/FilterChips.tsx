import { cn } from "@/lib/utils";
import { Hospital, UserCheck, AlertCircle, Stethoscope } from "lucide-react";

interface FilterChip {
  id: string;
  label: string;
  icon?: React.ElementType;
}

const filterChips: FilterChip[] = [
  { id: "nearby", label: "Nearby Hospitals", icon: Hospital },
  { id: "available", label: "Available Doctors", icon: UserCheck },
  { id: "urgent", label: "Urgent Care", icon: AlertCircle },
  { id: "specialists", label: "Specialists", icon: Stethoscope },
];

interface FilterChipsProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

export function FilterChips({ selectedFilters, onFilterChange }: FilterChipsProps) {
  const toggleFilter = (filterId: string) => {
    const newSelected = selectedFilters.includes(filterId)
      ? selectedFilters.filter((id) => id !== filterId)
      : [...selectedFilters, filterId];
    onFilterChange(newSelected);
  };

  return (
    <div className="w-full flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin">
      {filterChips.map((chip) => {
        const isActive = selectedFilters.includes(chip.id);
        const Icon = chip.icon;

        return (
          <button
            key={chip.id}
            onClick={() => toggleFilter(chip.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
              "border-2 active:scale-95",
              isActive
                ? "bg-primary border-primary text-primary-foreground shadow-md glow-green"
                : "bg-card border-border text-foreground hover:border-primary/50"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}
              />
            )}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
