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
    <div className="scrollbar-thin flex w-full gap-2 overflow-x-auto overflow-y-hidden pb-1 max-[380px]:gap-1.5 max-[380px]:pb-0.5">
      {filterChips.map((chip) => {
        const isActive = selectedFilters.includes(chip.id);
        const Icon = chip.icon;

        return (
          <button
            key={chip.id}
            onClick={() => toggleFilter(chip.id)}
            className={cn(
              "inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 max-[380px]:gap-1 max-[380px]:px-3 max-[380px]:py-2 max-[380px]:text-xs",
              "border-2 active:scale-95",
              isActive
                ? "bg-primary border-primary text-primary-foreground shadow-md glow-green"
                : "bg-card border-border text-foreground hover:border-primary/50"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-4 w-4 max-[380px]:h-3.5 max-[380px]:w-3.5",
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
