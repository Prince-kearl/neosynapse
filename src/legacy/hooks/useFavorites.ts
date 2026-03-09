import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { MealWithVendor } from "@/types/database";

const LOCAL_STORAGE_KEY = "chowpoint_favorites";

// Get favorites from localStorage for guests
function getLocalFavorites(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setLocalFavorites(favorites: string[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch favorite meal IDs
  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (user) {
        const { data, error } = await supabase
          .from("favorites")
          .select("meal_id")
          .eq("user_id", user.id);

        if (error) throw error;
        return data.map((f) => f.meal_id);
      }
      return getLocalFavorites();
    },
  });

  // Fetch full meal data for saved meals page
  const { data: favoriteMeals = [], isLoading: mealsLoading } = useQuery({
    queryKey: ["favorite-meals", user?.id, favoriteIds],
    queryFn: async () => {
      if (favoriteIds.length === 0) return [];

      const { data, error } = await supabase
        .from("meals")
        .select(`
          *,
          vendor:vendors(*)
        `)
        .in("id", favoriteIds);

      if (error) throw error;
      return data as unknown as MealWithVendor[];
    },
    enabled: favoriteIds.length > 0,
  });

  // Toggle favorite mutation
  const toggleMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const isFavorite = favoriteIds.includes(mealId);

      if (user) {
        if (isFavorite) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("meal_id", mealId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: user.id, meal_id: mealId });
          if (error) throw error;
        }
      } else {
        // Guest mode - use localStorage
        const current = getLocalFavorites();
        if (isFavorite) {
          setLocalFavorites(current.filter((id) => id !== mealId));
        } else {
          setLocalFavorites([...current, mealId]);
        }
      }

      return { mealId, wasFavorite: isFavorite };
    },
    onSuccess: ({ mealId, wasFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-meals"] });

      toast({
        title: wasFavorite ? "Removed from saved" : "Added to saved",
        description: wasFavorite
          ? "Meal removed from your favorites"
          : "Meal saved for later",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    favoriteIds,
    favoriteMeals,
    isLoading,
    mealsLoading,
    isFavorite: (mealId: string) => favoriteIds.includes(mealId),
    toggleFavorite: (mealId: string) => toggleMutation.mutate(mealId),
    isToggling: toggleMutation.isPending,
  };
}
