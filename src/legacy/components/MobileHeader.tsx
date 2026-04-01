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
  onSearch?: (query: string) => void;
  showSearchAndFilters?: boolean;
  showLocationRow?: boolean;
  selectedFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
  location?: string;
  radius?: number;
  onLocationChange?: (location: string) => void;
  onRadiusChange?: (radius: number) => void;
  onUseCurrentLocation?: () => void;
  locationError?: string | null;
  isLocating?: boolean;
}

export function MobileHeader({ 
  searchQuery = "", 
  onSearchChange,
  onSearch,
  showSearchAndFilters = true,
  showLocationRow = false,
  selectedFilters = [],
  onFilterChange,
  location,
  radius,
  onLocationChange,
  onRadiusChange,
  onUseCurrentLocation,
  locationError,
  isLocating
}: MobileHeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <header className="sticky top-0 z-50 bg-background lg:hidden">
      {/* Top Row - Location, Notification, Profile */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 max-[380px]:px-3 max-[380px]:py-2.5">
        {showLocationRow ? (
          <LocationSelector
            selectedLocation={location}
            radius={radius}
            onLocationChange={onLocationChange}
            onRadiusChange={onRadiusChange}
            onUseCurrentLocation={onUseCurrentLocation}
            locationError={locationError}
            isLocating={isLocating}
          />
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 max-[380px]:gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full max-[380px]:h-8 max-[380px]:w-8">
            <Bell className="h-4 w-4 text-muted-foreground max-[380px]:h-3.5 max-[380px]:w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-primary/10 max-[380px]:h-8 max-[380px]:w-8" asChild>
            <Link to="/patient/profile">
              <User className="h-4 w-4 text-primary max-[380px]:h-3.5 max-[380px]:w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      {showSearchAndFilters && (
        <div className="space-y-3 border-b border-border bg-card px-4 py-3 max-[380px]:space-y-2 max-[380px]:px-3 max-[380px]:py-2.5">
          <MobileSearchBar 
            value={localSearch} 
            onChange={handleSearchChange}
            onSearch={onSearch}
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
