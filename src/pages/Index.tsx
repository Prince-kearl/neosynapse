import { useState } from "react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CategoryPills } from "@/components/CategoryPills";
import { HealthProfileCard } from "@/components/HealthProfileCard";
import { MobileHeader } from "@/components/MobileHeader";
import { NearbyHospitalsSection } from "@/components/NearbyHospitalsSection";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearchAndFilters={true}
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
        />
      </div>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6 lg:space-y-8 max-w-7xl">
        {/* Hero Carousel */}
        <HeroCarousel />

        {/* Health Profile Completion */}
        <HealthProfileCard completionPercent={66} />

        {/* Health Services */}
        <section>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="font-display text-lg lg:text-xl font-semibold">
              Health Services
            </h2>
          </div>
          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </section>

        {/* Nearby Hospitals */}
        <NearbyHospitalsSection />
      </main>
    </div>
  );
};

export default Index;
