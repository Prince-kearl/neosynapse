import { ShoppingBag, Clock, CheckCircle, Loader2, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Order, OrderStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  ready: "bg-green-500/10 text-green-600 border-green-500/20",
  delivered: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          vendor:vendors(name),
          order_items(
            *,
            meal:meals(name, image_url)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as (Order & { vendor: { name: string } })[];
    },
    enabled: !!user,
  });

  const activeOrders = orders.filter(o => 
    ["pending", "confirmed", "preparing", "ready"].includes(o.status)
  );
  const completedOrders = orders.filter(o => 
    ["delivered", "cancelled"].includes(o.status)
  );

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Sign in to view orders</h1>
        <p className="text-muted-foreground mb-6">
          Track your orders and order history by signing in
        </p>
        <Button onClick={() => navigate("/auth?redirect=/orders")}>
          Sign In
        </Button>
      </div>
    );
  }

  const OrderCard = ({ order }: { order: Order & { vendor: { name: string } } }) => (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{order.vendor?.name || "Unknown Vendor"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge className={statusColors[order.status]}>
          {statusLabels[order.status]}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <Package className="w-4 h-4 text-muted-foreground" />
        <span>{order.order_items?.length || 0} item(s)</span>
        <span className="text-muted-foreground">•</span>
        <span className="font-semibold text-primary">
          GHS {Number(order.total_amount).toFixed(2)}
        </span>
      </div>

      <p className="text-xs text-muted-foreground truncate">
        {order.delivery_address}
      </p>
    </div>
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Your Orders
          </h1>
          <p className="text-muted-foreground">
            Track and manage your food orders
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="mb-6">
          <TabsList className="bg-muted w-full sm:w-auto">
            <TabsTrigger value="active" className="flex-1 sm:flex-none gap-2">
              <Clock className="w-4 h-4" />
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 sm:flex-none gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeOrders.length > 0 ? (
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  No Active Orders
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Your active orders will appear here. Start exploring delicious meals!
                </p>
                <Button onClick={() => navigate("/")} variant="outline">
                  Browse Meals
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : completedOrders.length > 0 ? (
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-8 lg:p-12 shadow-food-card text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  No Order History Yet
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your completed orders will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Orders;
