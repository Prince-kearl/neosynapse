import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Meal, Vendor, MealWithVendor } from "@/types/database";
import { calculateDistance, GeoLocation } from "@/hooks/useGeolocation";

// Import local images for fallback
import waakyeImg from "@/assets/food-waakye.jpg";
import jollofImg from "@/assets/food-jollof.jpg";
import bankuImg from "@/assets/food-banku.jpg";
import fufuImg from "@/assets/food-fufu.jpg";
import keleweleImg from "@/assets/food-kelewele.jpg";
import healthyImg from "@/assets/food-healthy.jpg";

// Map image URLs to local assets
const imageMap: Record<string, string> = {
  "/assets/food-waakye.jpg": waakyeImg,
  "/assets/food-jollof.jpg": jollofImg,
  "/assets/food-banku.jpg": bankuImg,
  "/assets/food-fufu.jpg": fufuImg,
  "/assets/food-kelewele.jpg": keleweleImg,
  "/assets/food-healthy.jpg": healthyImg,
};

export function getImageUrl(url: string | null): string {
  if (!url) return waakyeImg;
  return imageMap[url] || url;
}

// Default delivery radius in km
const DEFAULT_DELIVERY_RADIUS_KM = 10;

export interface MealFilters {
  budget?: number;
  search?: string;
  filters?: string[];
  category?: string | null;
  location?: GeoLocation | null;
  deliveryRadius?: number; // in km
  dietPreferences?: string[]; // user's diet preferences
}

// Helper to check if vendor is currently open based on open_hours string
function isVendorOpen(openHours: string | null): boolean {
  if (!openHours) return false;
  
  try {
    // Parse format like "8AM - 10PM" or "9:00 AM - 9:00 PM"
    const now = new Date();
    const currentHour = now.getHours();
    
    const match = openHours.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return true; // If can't parse, assume open
    
    let openHour = parseInt(match[1]);
    const openPeriod = match[3]?.toUpperCase();
    let closeHour = parseInt(match[4]);
    const closePeriod = match[6]?.toUpperCase();
    
    // Convert to 24-hour format
    if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
    if (openPeriod === 'AM' && openHour === 12) openHour = 0;
    if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
    if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;
    
    return currentHour >= openHour && currentHour < closeHour;
  } catch {
    return true; // Default to open if parsing fails
  }
}

export function useMeals({ budget, search, filters = [], category, location, deliveryRadius = DEFAULT_DELIVERY_RADIUS_KM, dietPreferences = [] }: MealFilters) {
  return useQuery({
    queryKey: ["meals", budget, search, filters, category, location?.latitude, location?.longitude, deliveryRadius, dietPreferences],
    queryFn: async () => {
      // Determine sort order based on filters
      const sortByPrice = filters.includes("cheapest");
      const sortByRating = filters.includes("popular");
      
      let query = supabase
        .from("meals")
        .select(`
          *,
          vendor:vendors(*)
        `);

      // Apply budget filter
      if (budget) {
        query = query.lte("price", budget);
      }

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply sorting - cheapest takes priority, then popular
      if (sortByPrice) {
        query = query.order("price", { ascending: true });
      } else if (sortByRating) {
        query = query.order("rating", { ascending: false });
      } else {
        query = query.order("rating", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching meals:", error);
        throw error;
      }

      let meals = (data as unknown as MealWithVendor[]) || [];
      
      // Apply location-based filtering - only show vendors within delivery radius
      if (location?.latitude && location?.longitude) {
        meals = meals.filter(meal => {
          const vendor = meal.vendor;
          if (!vendor?.latitude || !vendor?.longitude) {
            // If vendor has no coordinates, include them (fallback behavior)
            return true;
          }
          
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            Number(vendor.latitude),
            Number(vendor.longitude)
          );
          
          // Add distance to meal for display purposes
          (meal as any).distanceKm = distance;
          
          return distance <= deliveryRadius;
        });
        
        // Sort by distance when location is available
        meals.sort((a, b) => {
          const distA = (a as any).distanceKm ?? Infinity;
          const distB = (b as any).distanceKm ?? Infinity;
          return distA - distB;
        });
      }
      
      // Apply category filter on tags (client-side since tags is an array)
      if (category) {
        const categoryKeywords: Record<string, string[]> = {
          "waakye": ["waakye"],
          "rice": ["rice", "jollof", "fried rice"],
          "chop-bar": ["chop bar", "local", "traditional"],
          "fast-food": ["fast food", "burger", "pizza", "fries"],
          "healthy": ["healthy", "salad", "vegetarian", "vegan"],
          "breakfast": ["breakfast", "tea", "coffee", "bread"],
          "seafood": ["seafood", "fish", "tilapia", "shrimp"],
          "snacks": ["snacks", "kelewele", "plantain", "spring roll"],
        };
        
        const keywords = categoryKeywords[category] || [category];
        meals = meals.filter(meal => {
          const mealName = meal.name.toLowerCase();
          const mealTags = (meal.tags || []).map(t => t.toLowerCase());
          const mealDesc = (meal.description || "").toLowerCase();
          
          return keywords.some(keyword => 
            mealName.includes(keyword) || 
            mealTags.some(tag => tag.includes(keyword)) ||
            mealDesc.includes(keyword)
          );
        });
      }
      
      // Apply diet preferences filter
      // Restrictive preferences that must match meal tags
      const restrictivePreferences = ["vegetarian", "vegan", "halal", "gluten-free", "dairy-free", "nut-free"];
      const userRestrictive = dietPreferences.filter(p => restrictivePreferences.includes(p));
      
      if (userRestrictive.length > 0) {
        meals = meals.filter(meal => {
          const mealTags = (meal.tags || []).map(t => t.toLowerCase());
          // Meal must have ALL of the user's restrictive preferences
          return userRestrictive.every(pref => 
            mealTags.some(tag => tag.includes(pref.toLowerCase()))
          );
        });
      }
      
      // For "spicy" preference, boost spicy meals to the top but don't exclude others
      const likesSpicy = dietPreferences.includes("spicy");
      if (likesSpicy) {
        meals = meals.sort((a, b) => {
          const aIsSpicy = (a.tags || []).some(t => t.toLowerCase().includes("spicy"));
          const bIsSpicy = (b.tags || []).some(t => t.toLowerCase().includes("spicy"));
          if (aIsSpicy && !bIsSpicy) return -1;
          if (!aIsSpicy && bIsSpicy) return 1;
          return 0;
        });
      }
      
      // Apply client-side filters
      const filterOpenNow = filters.includes("open-now");
      const filterNearby = filters.includes("nearby");
      
      if (filterOpenNow) {
        meals = meals.filter(meal => isVendorOpen(meal.vendor?.open_hours || null));
      }
      
      // For nearby filter, ensure we have location and sort by distance
      if (filterNearby && location?.latitude && location?.longitude) {
        meals = meals.sort((a, b) => {
          const distA = (a as any).distanceKm ?? Infinity;
          const distB = (b as any).distanceKm ?? Infinity;
          return distA - distB;
        });
      }

      return meals;
    },
  });
}

export function useMeal(id: string | undefined) {
  return useQuery({
    queryKey: ["meal", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("meals")
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching meal:", error);
        throw error;
      }

      return data as unknown as MealWithVendor | null;
    },
    enabled: !!id,
  });
}
