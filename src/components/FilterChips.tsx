import { cn } from "@/lib/utils";
import { Star, MapPin, Clock, Wallet } from "lucide-react";

interface FilterChip {
  id: string;
  label: string;
  icon?: React.ElementType;
}

const filterChips: FilterChip[] = [
  { id: "cheapest", label: "Cheapest", icon: Wallet },
  { id: "open-now", label: "Open Now", icon: Clock },
  { id: "popular", label: "Popular", icon: Star },
  { id: "nearby", label: "Nearby", icon: MapPin },
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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin -mx-4 px-4">
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
                ? "bg-primary border-primary text-primary-foreground shadow-md"
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
