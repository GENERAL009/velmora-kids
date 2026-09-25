// ============================================================
// User & Auth
// ============================================================

export type UserRole = "customer" | "admin" | "manager" | "warehouse_staff" | "super_admin" | "director" | "seller" | "call_center";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ============================================================
// Product
// ============================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  sku: string;
  brand?: Brand;
  brand_id?: string;
  category?: Category;
  category_id: string;
  collection?: Collection;
  collection_id?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  currency: string;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  views?: number;
  avg_rating: number;
  review_count: number;
  gender?: "girls" | "boys" | "unisex" | "newborn";
  age_min?: number;
  age_max?: number;
  material?: string;
  care_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: Size;
  size_id: string;
  color: Color;
  color_id: string;
  sku: string;
  price_override?: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

// ============================================================
// Category, Brand, Collection, Size, Color
// ============================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent_id?: string;
  parent?: Category;
  children?: Category[];
  product_count?: number;
  sort_order: number;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  is_active: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export interface Size {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  size_type: "clothing" | "shoes" | "accessories";
}

export interface Color {
  id: string;
  name: string;
  slug: string;
  hex_code: string;
}

// ============================================================
// Cart
// ============================================================

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

// ============================================================
// Order
// ============================================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "partially_paid"
  | "failed"
  | "refunded";

export type PaymentMethod =
  | "cash"
  | "card"
  | "click"
  | "payme"
  | "uzum"
  | "bank_transfer";

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user?: User;
  items: OrderItem[];
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  shipping_address: CustomerAddress;
  billing_address?: CustomerAddress;
  notes?: string;
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product: Product;
  variant_id: string;
  variant: ProductVariant;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ============================================================
// Inventory
// ============================================================

export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "transfer"
  | "damage"
  | "write_off";

export interface Inventory {
  id: string;
  variant_id: string;
  variant?: ProductVariant;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  type: InventoryMovementType;
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

// ============================================================
// Supplier & Purchases
// ============================================================

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PurchaseStatus =
  | "draft"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled";

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier?: Supplier;
  items: PurchaseItem[];
  status: PurchaseStatus;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  currency: string;
  notes?: string;
  ordered_at?: string;
  received_at?: string;
  expected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  variant_id: string;
  variant?: ProductVariant;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
}

// ============================================================
// Customer
// ============================================================

export interface CustomerProfile {
  id: string;
  user_id: string;
  user?: User;
  date_of_birth?: string;
  gender?: string;
  children?: CustomerChild[];
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerChild {
  name: string;
  date_of_birth: string;
  gender: "girl" | "boy";
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region?: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
}

// ============================================================
// CRM
// ============================================================

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost";

export type LeadSource =
  | "website"
  | "instagram"
  | "telegram"
  | "referral"
  | "walk_in"
  | "other";

export interface CRMLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to?: string;
  assigned_user?: User;
  notes?: string;
  converted_customer_id?: string;
  activities?: CRMActivity[];
  created_at: string;
  updated_at: string;
}

export type CRMActivityType =
  | "call"
  | "email"
  | "message"
  | "meeting"
  | "note"
  | "task";

export interface CRMActivity {
  id: string;
  lead_id?: string;
  customer_id?: string;
  type: CRMActivityType;
  title: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
}

// ============================================================
// Reviews & Questions
// ============================================================

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user?: User;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  user?: User;
  question: string;
  answer?: string;
  answered_by?: string;
  answered_at?: string;
  is_approved: boolean;
  created_at: string;
}

// ============================================================
// Marketing
// ============================================================

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobile_image?: string;
  link?: string;
  button_text?: string;
  position: "hero" | "category" | "promo" | "sidebar";
  sort_order: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  description?: string;
  discount_type: "percentage" | "fixed_amount" | "free_shipping";
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "order" | "promotion" | "system" | "reminder";
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// ============================================================
// Pagination & API Response
// ============================================================

export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  page_size: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
  status_code: number;
}

// ============================================================
// Filter & Sort
// ============================================================

export interface ProductFilters {
  category_id?: string;
  brand_id?: string;
  collection_id?: string;
  gender?: string;
  min_price?: number;
  max_price?: number;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
  is_new?: boolean;
  is_bestseller?: boolean;
  on_sale?: boolean;
  search?: string;
  sort_by?: "price_asc" | "price_desc" | "newest" | "popular" | "rating";
  page?: number;
  page_size?: number;
}
