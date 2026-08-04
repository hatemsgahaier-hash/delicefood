import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Role = 'client' | 'restaurateur' | 'livreur';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  vehicle_info: string | null;
  is_available: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  city: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_open: boolean;
  rating: number;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  promotion_price: number | null;
  ingredients: string[];
  created_at: string;
}

export interface Ingredient {
  id: string;
  restaurant_id: string;
  name: string;
}

export interface Supplement {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
}

export interface Cart {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  created_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  supplements: { id: string; name: string; price: number }[];
}

export interface Order {
  id: string;
  client_id: string;
  restaurant_id: string;
  delivery_address: {
    label: string;
    street: string;
    city: string;
    postal_code?: string;
  };
  status: OrderStatus;
  total: number;
  promo_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'preparing'
  | 'ready'
  | 'awaiting_driver'
  | 'driver_assigned'
  | 'driver_enroute'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  supplements: { name: string; price: number }[];
}

export interface Delivery {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: DeliveryStatus;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'to_restaurant'
  | 'picked_up'
  | 'to_client'
  | 'delivered';

export interface Payment {
  id: string;
  order_id: string;
  method: 'card' | 'cash' | 'wallet';
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  transaction_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  client_id: string;
  order_id: string | null;
  restaurant_id: string | null;
  driver_id: string | null;
  rating: number;
  comment: string | null;
  target_type: 'restaurant' | 'driver';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}
