import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BudgetSelector } from "@/components/BudgetSelector";
import { CategoryPills } from "@/components/CategoryPills";
import { FoodCard } from "@/components/FoodCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useMeals, getImageUrl } from "@/hooks/useMeals";
import { MobileHeader } from "@/components/MobileHeader";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "@/contexts/LocationContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFavorites } from "@/hooks/useFavorites";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("popular");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  const { addToCart } = useCart();
  const { location, deliveryRadius } = useLocation();

  // Set budget from saved preferences once loaded
  useEffect(() => {
    if (!prefsLoading && budget === null) {
      setBudget(preferences.defaultBudget);
    }
  }, [prefsLoading, preferences.defaultBudget, budget]);

  // Use preferences budget while loading, then user-selected budget
  const activeBudget = budget ?? preferences.defaultBudget;

  const { data: meals = [], isLoading, error } = useMeals({ 
    budget: activeBudget, 
    search: searchQuery, 
    filters: selectedFilters,
    category: selectedCategory,
    location,
    deliveryRadius,
    dietPreferences: preferences.dietPreferences,
  });

  // Filter by search query on vendor name (meals already filtered by budget in hook)
  const filteredFoods = meals.filter((meal) => {
    const matchesSearch =
      !searchQuery ||
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleOrder = (id: string) => {
    const meal = meals.find((m) => m.id === id);
    if (meal) {
      addToCart(meal);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Mobile Header with Search & Filters - hidden on desktop */}
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

        {/* Budget Selector */}
        <BudgetSelector 
          budget={activeBudget} 
          onBudgetChange={setBudget} 
          savedBudget={preferences.defaultBudget}
        />

        {/* Active Diet Preferences Badge */}
        {preferences.dietPreferences.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtering by:</span>
            {preferences.dietPreferences.map((pref) => (
              <Badge 
                key={pref} 
                variant="secondary"
                className="capitalize bg-primary/10 text-primary border-primary/20"
              >
                {pref}
              </Badge>
            ))}
            <Link 
              to="/profile" 
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              Edit preferences
            </Link>
          </div>
        )}

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="font-display text-lg lg:text-xl font-semibold">
              Explore Categories
            </h2>
            <Link 
              to="/explore" 
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-2">
            <CategoryPills
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </section>

        {/* Food Grid */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted w-full sm:w-auto">
                <TabsTrigger value="popular" className="flex-1 sm:flex-none">Popular</TabsTrigger>
                <TabsTrigger value="nearby" className="flex-1 sm:flex-none">Nearby</TabsTrigger>
                <TabsTrigger value="cheapest" className="flex-1 sm:flex-none">Cheapest</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-sm text-muted-foreground text-center sm:text-right">
              {filteredFoods.length} meals found
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 lg:py-16">
              <p className="text-lg lg:text-xl font-display font-semibold text-foreground mb-2">
                Failed to load meals
              </p>
              <p className="text-muted-foreground text-sm lg:text-base">
                Please try again later
              </p>
            </div>
          ) : filteredFoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {filteredFoods.map((meal, index) => {
                // Get calculated distance or show fallback
                const distanceKm = (meal as any).distanceKm;
                const distanceDisplay = distanceKm != null 
                  ? `${distanceKm.toFixed(1)}km` 
                  : "—";
                
                return (
                  <div
                    key={meal.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <FoodCard
                      id={meal.id}
                      name={meal.name}
                      vendor={meal.vendor?.name || "Unknown Vendor"}
                      price={Number(meal.price)}
                      originalPrice={meal.original_price ? Number(meal.original_price) : undefined}
                      distance={distanceDisplay}
                      rating={Number(meal.rating)}
                      image={getImageUrl(meal.image_url)}
                      tags={meal.tags || []}
                      isSaved={isFavorite(meal.id)}
                      onSave={toggleFavorite}
                      onOrder={handleOrder}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 lg:py-16">
              <p className="text-lg lg:text-xl font-display font-semibold text-foreground mb-2">
                No meals found
              </p>
              <p className="text-muted-foreground text-sm lg:text-base">
                Try adjusting your budget or search terms
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
