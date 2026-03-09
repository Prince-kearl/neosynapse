// Database types for ChowPoint

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  address: string;
  rating: number;
  total_orders: number;
  total_reviews: number;
  description: string | null;
  open_hours: string | null;
  categories: string[];
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  rating: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface MealWithVendor extends Meal {
  vendor: Vendor;
}

export interface Review {
  id: string;
  user_id: string;
  vendor_id: string;
  meal_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
  };
}

export interface Favorite {
  id: string;
  user_id: string;
  meal_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  default_budget: number;
  diet_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface VendorFollow {
  id: string;
  user_id: string;
  vendor_id: string;
  created_at: string;
}

// Order types
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  vendor_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_address: string;
  delivery_phone: string;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  meal_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  meal?: Meal;
}

// Cart types (client-side only)
export interface CartItem {
  meal: MealWithVendor;
  quantity: number;
}
