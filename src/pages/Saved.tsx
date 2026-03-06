import { Heart, Utensils, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { FoodCard } from "@/components/FoodCard";
import { getImageUrl } from "@/hooks/useMeals";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "@/contexts/LocationContext";
import { calculateDistance } from "@/hooks/useGeolocation";

const Saved = () => {
  const navigate = useNavigate();
  const { favoriteMeals, isLoading, mealsLoading, isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const { location } = useLocation();

  const handleOrder = (id: string) => {
    const meal = favoriteMeals.find((m) => m.id === id);
    if (meal) {
      addToCart(meal);
    }
  };

  const loading = isLoading || mealsLoading;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Saved Meals
          </h1>
          <p className="text-muted-foreground">
            Your favorite meals all in one place
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : favoriteMeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {favoriteMeals.map((meal, index) => {
              // Calculate distance if location is available
              let distanceDisplay = "—";
              if (location?.latitude && location?.longitude && meal.vendor?.latitude && meal.vendor?.longitude) {
                const distance = calculateDistance(
                  location.latitude,
                  location.longitude,
                  Number(meal.vendor.latitude),
                  Number(meal.vendor.longitude)
                );
                distanceDisplay = `${distance.toFixed(1)}km`;
              }

              return (
                <div
                  key={meal.id}
                  className="animate-fade-in"
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
          <>
            {/* Empty State */}
            <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Heart className="w-10 h-10 text-accent" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                No Saved Meals Yet
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Tap the heart icon on any meal to save it here for quick access later. Build your personal collection of favorites!
              </p>
              <Button 
                onClick={() => navigate("/")}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <Utensils className="w-4 h-4" />
                Explore Meals
              </Button>
            </div>

            {/* Tip Card */}
            <div className="mt-6 bg-secondary/50 rounded-2xl p-5 border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                💡 Pro Tip
              </h3>
              <p className="text-sm text-muted-foreground">
                Save meals you love to quickly reorder them later. Your saved meals sync across all your devices when you're logged in.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Saved;
