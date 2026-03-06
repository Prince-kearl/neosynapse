import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "chowpoint_follows";

// Get follows from localStorage for guests
function getLocalFollows(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setLocalFollows(follows: string[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(follows));
}

export function useVendorFollow(vendorId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user follows this vendor
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: ["vendor-follow", user?.id, vendorId],
    queryFn: async () => {
      if (!vendorId) return false;

      if (user) {
        const { data, error } = await supabase
          .from("vendor_follows")
          .select("id")
          .eq("user_id", user.id)
          .eq("vendor_id", vendorId)
          .maybeSingle();

        if (error) throw error;
        return !!data;
      }
      return getLocalFollows().includes(vendorId);
    },
    enabled: !!vendorId,
  });

  // Toggle follow mutation
  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("No vendor ID provided");

      if (user) {
        if (isFollowing) {
          const { error } = await supabase
            .from("vendor_follows")
            .delete()
            .eq("user_id", user.id)
            .eq("vendor_id", vendorId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("vendor_follows")
            .insert({ user_id: user.id, vendor_id: vendorId });
          if (error) throw error;
        }
      } else {
        // Guest mode - use localStorage
        const current = getLocalFollows();
        if (isFollowing) {
          setLocalFollows(current.filter((id) => id !== vendorId));
        } else {
          setLocalFollows([...current, vendorId]);
        }
      }

      return { wasFollowing: isFollowing };
    },
    onSuccess: ({ wasFollowing }) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-follow", user?.id, vendorId] });

      toast({
        title: wasFollowing ? "Unfollowed" : "Following",
        description: wasFollowing
          ? "You'll no longer see updates from this vendor"
          : "You'll get updates when this vendor adds new meals",
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
    isFollowing,
    isLoading,
    toggleFollow: () => toggleMutation.mutate(),
    isToggling: toggleMutation.isPending,
  };
}
