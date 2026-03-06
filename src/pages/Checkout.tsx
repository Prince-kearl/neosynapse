import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, MapPin, Phone, FileText, Loader2, CheckCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveryMode } from "@/contexts/DeliveryModeContext";
import { supabase } from "@/integrations/supabase/client";
import { getImageUrl } from "@/hooks/useMeals";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const deliverySchema = z.object({
  deliveryAddress: z.string().trim().min(5, "Address must be at least 5 characters").max(500),
  deliveryPhone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  deliveryNotes: z.string().max(500).optional(),
});

const pickupSchema = z.object({
  deliveryPhone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  deliveryNotes: z.string().max(500).optional(),
});

export default function Checkout() {
  const { items, getTotal, clearCart, getVendorId } = useCart();
  const { user } = useAuth();
  const { mode, isPickup } = useDeliveryMode();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Redirect if not logged in or cart is empty
  if (!user) {
    navigate("/auth?redirect=/checkout");
    return null;
  }

  if (items.length === 0 && !orderPlaced) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs based on mode
    const schema = isPickup ? pickupSchema : deliverySchema;
    const validation = schema.safeParse({
      deliveryAddress: isPickup ? "Pickup" : deliveryAddress,
      deliveryPhone,
      deliveryNotes: deliveryNotes || undefined,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const vendorId = getVendorId();
      if (!vendorId) {
        throw new Error("No vendor found in cart");
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          vendor_id: vendorId,
          total_amount: getTotal(),
          delivery_address: isPickup ? `PICKUP: ${items[0]?.meal?.vendor?.address || 'See vendor'}` : deliveryAddress,
          delivery_phone: deliveryPhone,
          delivery_notes: isPickup ? `[PICKUP ORDER] ${deliveryNotes || ''}`.trim() : (deliveryNotes || null),
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        meal_id: item.meal.id,
        quantity: item.quantity,
        unit_price: item.meal.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Success
      setOrderId(order.id);
      setOrderPlaced(true);
      clearCart();

      toast({
        title: "Order placed!",
        description: "Your order has been submitted successfully",
      });
    } catch (err: any) {
      console.error("Order error:", err);
      setError("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order confirmation screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Order Placed!</h1>
        <Badge className="mb-4" variant={isPickup ? "secondary" : "default"}>
          {isPickup ? "🏪 Pickup Order" : "🚚 Delivery Order"}
        </Badge>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {isPickup 
            ? "Your order has been submitted. Head to the vendor to pick up your meal when it's ready."
            : "Your order has been submitted. The vendor will prepare your meal shortly. Pay with cash when it arrives."
          }
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Order ID: <span className="font-mono">{orderId?.slice(0, 8)}</span>
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/orders")}>
            View Orders
          </Button>
          <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Checkout</h1>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Order Summary */}
        <section className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-display font-semibold mb-3">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.meal.id} className="flex gap-3">
                <img
                  src={getImageUrl(item.meal.image_url)}
                  alt={item.meal.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{item.meal.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-sm">
                  GHS {(item.meal.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>GHS {getTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Type</span>
              <Badge variant={isPickup ? "secondary" : "default"} className="gap-1">
                {isPickup ? <Store className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {isPickup ? "Pickup" : "Delivery"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="text-primary font-medium">{isPickup ? "Pay at pickup" : "Cash on delivery"}</span>
            </div>
            <div className="flex justify-between font-display font-bold text-lg pt-2">
              <span>Total</span>
              <span className="text-primary">GHS {getTotal().toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Delivery/Pickup Details */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h2 className="font-display font-semibold">
              {isPickup ? "Pickup Details" : "Delivery Details"}
            </h2>

            {isPickup && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm">
                <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Pickup Location
                </p>
                <p className="text-muted-foreground">
                  {items[0]?.meal?.vendor?.address || "Vendor address will be provided"}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {!isPickup && (
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Delivery Address
                </Label>
                <Textarea
                  id="address"
                  placeholder="Enter your full delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="min-h-[80px] rounded-xl resize-none"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+233 XX XXX XXXX"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {isPickup ? "Pickup Notes (Optional)" : "Delivery Notes (Optional)"}
              </Label>
              <Textarea
                id="notes"
                placeholder={isPickup ? "e.g., I'll arrive around 2pm..." : "Any special instructions..."}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="min-h-[60px] rounded-xl resize-none"
              />
            </div>
          </section>

          <Button
            type="submit"
            className="w-full h-14 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isPickup ? <Store className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                {isPickup ? "Place Pickup Order" : "Place Order"} • GHS {getTotal().toFixed(2)}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
