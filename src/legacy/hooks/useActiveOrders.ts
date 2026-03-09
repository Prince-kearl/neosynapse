import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useActiveOrders() {
  const { user } = useAuth();

  const { data: activeOrderCount = 0 } = useQuery({
    queryKey: ["activeOrders", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed", "preparing", "ready"]);

      if (error) {
        console.error("Error fetching active orders:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return { activeOrderCount };
}
