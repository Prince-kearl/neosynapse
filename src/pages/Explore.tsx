import { useState, useEffect, useRef, useCallback } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMeals, getImageUrl } from "@/hooks/useMeals";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLocation } from "@/contexts/LocationContext";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/hooks/useFavorites";
import { FoodCard } from "@/components/FoodCard";
import { BudgetSelector } from "@/components/BudgetSelector";
import { FilterChips } from "@/components/FilterChips";
import { Link } from "react-router-dom";

const categories = [
  { id: "jollof", name: "Jollof", emoji: "🍚" },
  { id: "banku", name: "Banku", emoji: "🥣" },
  { id: "fufu", name: "Fufu", emoji: "🍲" },
  { id: "waakye", name: "Waakye", emoji: "🫘" },
  { id: "kelewele", name: "Kelewele", emoji: "🍠" },
  { id: "chicken", name: "Chicken", emoji: "🍗" },
  { id: "fish", name: "Fish", emoji: "🐟" },
  { id: "rice", name: "Rice Dishes", emoji: "🍛" },
  { id: "soups", name: "Soups", emoji: "🥘" },
  { id: "grills", name: "Grills", emoji: "🔥" },
  { id: "salads", name: "Salads", emoji: "🥗" },
  { id: "drinks", name: "Drinks", emoji: "🥤" },
];

const ITEMS_PER_PAGE = 12;

const Explore = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { location, deliveryRadius } = useLocation();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set budget from saved preferences once loaded
  useEffect(() => {
    if (!prefsLoading && budget === null) {
      setBudget(preferences.defaultBudget);
    }
  }, [prefsLoading, preferences.defaultBudget, budget]);

  const activeBudget = budget ?? preferences.defaultBudget;

  const { data: meals = [], isLoading } = useMeals({
    budget: activeBudget,
    search: searchQuery,
    category: selectedCategory,
    location,
    deliveryRadius,
    dietPreferences: preferences.dietPreferences,
    filters: selectedFilters,
  });

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [selectedCategory, searchQuery, activeBudget, preferences.dietPreferences, selectedFilters]);

  // Infinite scroll observer
  const loadMore = useCallback(() => {
    if (visibleCount < meals.length) {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, meals.length));
    }
  }, [visibleCount, meals.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  const visibleMeals = meals.slice(0, visibleCount);
  const hasMore = visibleCount < meals.length;

  const handleOrder = (id: string) => {
    const meal = meals.find((m) => m.id === id);
    if (meal) {
      addToCart(meal);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Explore Food
          </h1>
          <p className="text-muted-foreground">
            Discover new meals and vendors near you
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for any food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-card border-border"
            />
          </div>
          <Button className="h-12 px-5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Budget Selector */}
        <div className="mb-6">
          <BudgetSelector 
            budget={activeBudget} 
            onBudgetChange={setBudget} 
            savedBudget={preferences.defaultBudget}
          />
        </div>

        {/* Filter Chips */}
        <div className="mb-6">
          <FilterChips 
            selectedFilters={selectedFilters}
            onFilterChange={setSelectedFilters}
          />
        </div>

        {/* Active Diet Preferences Badge */}
        {preferences.dietPreferences.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
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

        {/* Sticky Categories Section */}
        <div className="sticky top-0 z-20 bg-background py-4 -mx-4 px-4 lg:-mx-6 lg:px-6 border-b border-border/50 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Categories
          </h2>
          <div className="overflow-x-auto -mx-4 px-4 lg:-mx-6 lg:px-6 pb-2 scrollbar-thin">
            <div className="flex gap-2 min-w-max">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 whitespace-nowrap",
                    "hover:shadow-sm active:scale-[0.98]",
                    selectedCategory === category.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-lg" role="img" aria-label={category.name}>
                    {category.emoji}
                  </span>
                  <span className="text-sm font-medium">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Meal Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {selectedCategory 
                ? `${categories.find(c => c.id === selectedCategory)?.name || 'Results'}`
                : 'All Meals'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {visibleMeals.length} of {meals.length} meals
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : meals.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {visibleMeals.map((meal, index) => {
                  const distanceKm = (meal as any).distanceKm;
                  const distanceDisplay = distanceKm != null 
                    ? `${distanceKm.toFixed(1)}km` 
                    : "—";
                  
                  return (
                    <div
                      key={meal.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${(index % ITEMS_PER_PAGE) * 50}ms` }}
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

              {/* Infinite scroll trigger */}
              {hasMore && (
                <div 
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-8"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
                </div>
              )}

              {!hasMore && meals.length > ITEMS_PER_PAGE && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  You've seen all {meals.length} meals
                </p>
              )}
            </>
          ) : (
            <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Search className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                No meals found
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {selectedCategory 
                  ? "Try selecting a different category or adjusting your budget."
                  : "Try searching for something specific or adjust your filters."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explore;
