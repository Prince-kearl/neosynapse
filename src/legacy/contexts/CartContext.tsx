import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { CartItem, MealWithVendor } from "@/types/database";
import { toast } from "@/hooks/use-toast";

interface CartContextType {
  items: CartItem[];
  addToCart: (meal: MealWithVendor, quantity?: number) => void;
  removeFromCart: (mealId: string) => void;
  updateQuantity: (mealId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getVendorId: () => string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "chowpoint_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load from localStorage on init
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Persist to localStorage when items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const getVendorId = () => {
    if (items.length === 0) return null;
    return items[0].meal.vendor_id;
  };

  const addToCart = (meal: MealWithVendor, quantity: number = 1) => {
    setItems((current) => {
      // Check if cart has items from different vendor
      const currentVendorId = current.length > 0 ? current[0].meal.vendor_id : null;
      
      if (currentVendorId && currentVendorId !== meal.vendor_id) {
        toast({
          title: "Different vendor",
          description: "You can only order from one vendor at a time. Clear your cart first.",
          variant: "destructive",
        });
        return current;
      }

      const existing = current.find((item) => item.meal.id === meal.id);
      
      if (existing) {
        toast({
          title: "Updated cart",
          description: `${meal.name} quantity updated`,
        });
        return current.map((item) =>
          item.meal.id === meal.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      toast({
        title: "Added to cart",
        description: `${meal.name} added to your cart`,
      });
      return [...current, { meal, quantity }];
    });
  };

  const removeFromCart = (mealId: string) => {
    setItems((current) => current.filter((item) => item.meal.id !== mealId));
  };

  const updateQuantity = (mealId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(mealId);
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.meal.id === mealId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + item.meal.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        getVendorId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
