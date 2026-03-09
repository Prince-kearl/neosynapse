import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "chowpoint_preferences";

interface UserPreferences {
  defaultBudget: number;
  dietPreferences: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultBudget: 50,
  dietPreferences: [],
};

export function useUserPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      
      if (user) {
        // Load from database for authenticated users
        const { data, error } = await supabase
          .from("profiles")
          .select("default_budget, diet_preferences")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading preferences:", error);
          // Fall back to localStorage
          loadFromLocalStorage();
        } else if (data) {
          setPreferences({
            defaultBudget: data.default_budget ?? DEFAULT_PREFERENCES.defaultBudget,
            dietPreferences: data.diet_preferences ?? DEFAULT_PREFERENCES.dietPreferences,
          });
        } else {
          // No profile exists yet, use defaults
          loadFromLocalStorage();
        }
      } else {
        // Load from localStorage for guests
        loadFromLocalStorage();
      }
      
      setIsLoading(false);
    };

    const loadFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPreferences({
            defaultBudget: parsed.defaultBudget ?? DEFAULT_PREFERENCES.defaultBudget,
            dietPreferences: parsed.dietPreferences ?? DEFAULT_PREFERENCES.dietPreferences,
          });
        }
      } catch {
        // Ignore parsing errors
      }
    };

    loadPreferences();
  }, [user]);

  // Save budget
  const saveBudget = useCallback(async (budget: number) => {
    const newPreferences = { ...preferences, defaultBudget: budget };
    
    if (user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update({ default_budget: budget, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) {
          toast({
            title: "Error saving budget",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from("profiles")
          .insert({ 
            user_id: user.id, 
            default_budget: budget,
            diet_preferences: preferences.dietPreferences
          });

        if (error) {
          toast({
            title: "Error saving budget",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }
      }
    } else {
      // Save to localStorage for guests
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPreferences));
    }

    setPreferences(newPreferences);
    toast({
      title: "Budget updated",
      description: `Your default budget is now GHS ${budget}`,
    });
  }, [user, preferences, toast]);

  // Save diet preferences
  const saveDietPreferences = useCallback(async (dietPreferences: string[]) => {
    const newPreferences = { ...preferences, dietPreferences };
    
    if (user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update({ diet_preferences: dietPreferences, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) {
          toast({
            title: "Error saving preferences",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from("profiles")
          .insert({ 
            user_id: user.id, 
            default_budget: preferences.defaultBudget,
            diet_preferences: dietPreferences
          });

        if (error) {
          toast({
            title: "Error saving preferences",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }
      }
    } else {
      // Save to localStorage for guests
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPreferences));
    }

    setPreferences(newPreferences);
    
    const count = dietPreferences.length;
    toast({
      title: "Preferences updated",
      description: count > 0 
        ? `${count} diet preference${count > 1 ? 's' : ''} saved`
        : "No diet restrictions set",
    });
  }, [user, preferences, toast]);

  return {
    preferences,
    isLoading,
    saveBudget,
    saveDietPreferences,
  };
}
