import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Vendor, Meal, Review } from "@/types/database";

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching vendor:", error);
        throw error;
      }

      return data as Vendor | null;
    },
    enabled: !!id,
  });
}

export function useVendorMeals(vendorId: string | undefined) {
  return useQuery({
    queryKey: ["vendor-meals", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("rating", { ascending: false });

      if (error) {
        console.error("Error fetching vendor meals:", error);
        throw error;
      }

      return (data as Meal[]) || [];
    },
    enabled: !!vendorId,
  });
}

export function useVendorReviews(vendorId: string | undefined) {
  return useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
        throw error;
      }

      return (data as Review[]) || [];
    },
    enabled: !!vendorId,
  });
}
