import { useState } from "react";
import { LocationSelector } from "./LocationSelector";
import { MobileSearchBar } from "./MobileSearchBar";
import { FilterChips } from "./FilterChips";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface MobileHeaderProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearchAndFilters?: boolean;
  selectedFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
}

export function MobileHeader({ 
  searchQuery = "", 
  onSearchChange,
  showSearchAndFilters = true,
  selectedFilters = [],
  onFilterChange
}: MobileHeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <header className="sticky top-0 z-50 bg-background lg:hidden">
      {/* Top Row - Location, Notification, Profile */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <LocationSelector />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-primary/10" asChild>
            <Link to="/profile">
              <User className="w-4 h-4 text-primary" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      {showSearchAndFilters && (
        <div className="px-4 py-3 space-y-3 bg-card border-b border-border">
          <MobileSearchBar 
            value={localSearch} 
            onChange={handleSearchChange}
          />
          <FilterChips 
            selectedFilters={selectedFilters}
            onFilterChange={onFilterChange || (() => {})}
          />
        </div>
      )}
    </header>
  );
}
