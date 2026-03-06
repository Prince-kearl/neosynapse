import { useState } from "react";
import { LocationSelector } from "./LocationSelector";
import { DeliveryToggle } from "./DeliveryToggle";
import { MobileSearchBar } from "./MobileSearchBar";
import { FilterChips } from "./FilterChips";
import { CartSheet } from "./CartSheet";

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
      {/* Top Row - Location, Toggle, Cart */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        {/* Location Selector */}
        <LocationSelector />

        {/* Right Side - Toggle + Cart */}
        <div className="flex items-center gap-2">
          <DeliveryToggle />
          <CartSheet />
        </div>
      </div>

      {/* Search Bar & Filters - Only on Home */}
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
