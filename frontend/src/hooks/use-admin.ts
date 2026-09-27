import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";

interface DashboardKPIs {
  revenue: number;
  orders: number;
  average_order_value: number;
  pending_orders: number;
  low_stock: number;
  out_of_stock: number;
  total_products: number;
  period_days: number;
}

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  product: string;
  sold: number;
  revenue: number;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method?: string;
  payment_status: string;
  created_at: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
  items_count?: number;
}

interface PaginatedOrders {
  items: AdminOrder[];
  total: number;
  page: number;
  pages: number;
}

interface LowStockItem {
  id: string;
  sku: string;
  stock: number;
  is_active: boolean;
  additional_price: number;
  product?: { id: string; name: string; sku: string };
  color?: { id: string; name: string; hex_code: string };
}

export function useDashboardKPIs(days: number = 30) {
  return useQuery({
    queryKey: ["admin", "dashboard", days],
    queryFn: () => apiGet<DashboardKPIs>(`/reports/dashboard?days=${days}`),
    retry: 1,
  });
}

export function useRevenueData(days: number = 7) {
  return useQuery({
    queryKey: ["admin", "revenue", days],
    queryFn: () => apiGet<RevenueDataPoint[]>(`/reports/revenue?days=${days}`),
    retry: 1,
  });
}

export function useTopProducts(limit: number = 5) {
  return useQuery({
    queryKey: ["admin", "top-products", limit],
    queryFn: () => apiGet<TopProduct[]>(`/reports/top-products?limit=${limit}`),
    retry: 1,
  });
}

export function useRecentOrders(pageSize: number = 5) {
  return useQuery({
    queryKey: ["admin", "recent-orders", pageSize],
    queryFn: () =>
      apiGet<PaginatedOrders>(`/orders?page=1&page_size=${pageSize}`),
    retry: 1,
  });
}

export function useLowStockItems(threshold: number = 5) {
  return useQuery({
    queryKey: ["admin", "low-stock", threshold],
    queryFn: () =>
      apiGet<LowStockItem[]>(`/inventory/low-stock?threshold=${threshold}`),
    retry: 1,
  });
}

export interface AdminOrdersParams {
  page?: number;
  page_size?: number;
  order_status?: string;
  payment_status?: string;
  search?: string;
}

export interface AdminOrderDetail {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  delivery_method?: string;
  delivery_city?: string;
  delivery_address?: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  comment?: string;
  items: {
    id: string;
    product_name: string;
    product_sku: string;
    size_name?: string | null;
    color_name: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    total: number;
  }[];
  created_at: string;
  confirmed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
}

export function useAdminOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => apiGet<AdminOrderDetail>(`/orders/${orderId}`),
    enabled: !!orderId,
    retry: 1,
  });
}

export function useAdminOrders(params: AdminOrdersParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: () => apiGet<PaginatedOrders>(`/orders${qs ? `?${qs}` : ""}`),
    retry: 1,
  });
}

export interface AdminCustomer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface PaginatedCustomers {
  items: AdminCustomer[];
  total: number;
  page: number;
  pages: number;
}

export function useAdminCustomers(params: { search?: string; page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return useQuery({
    queryKey: ["admin", "customers", params],
    queryFn: () => apiGet<PaginatedCustomers>(`/customers${qs ? `?${qs}` : ""}`),
    retry: 1,
  });
}

export interface StockItem {
  id: string;
  sku: string;
  stock: number;
  is_active: boolean;
  additional_price: number;
  product?: { id: string; name: string; sku: string };
  color?: { id: string; name: string; hex_code: string };
}

interface PaginatedStock {
  items: StockItem[];
  total: number;
  page: number;
  pages: number;
}

export function useAdminInventory(params: {
  page?: number;
  page_size?: number;
  search?: string;
  low_stock?: boolean;
  out_of_stock?: boolean;
} = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return useQuery({
    queryKey: ["admin", "inventory", params],
    queryFn: () => apiGet<PaginatedStock>(`/inventory${qs ? `?${qs}` : ""}`),
    retry: 1,
  });
}

export interface StockLogItem {
  id: string;
  product_variant_id: string;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  note?: string;
  created_at: string;
}

export function useStockLogs(variantId: string) {
  return useQuery({
    queryKey: ["admin", "stock-logs", variantId],
    queryFn: () => apiGet<StockLogItem[]>(`/inventory/logs/${variantId}`),
    enabled: !!variantId,
    retry: 1,
  });
}

export interface CRMLead {
  id: string;
  customer_name: string;
  customer_phone: string;
  source: string;
  notes: string;
  priority: string;
  status: string;
  assigned_to_id?: string;
  assigned_to?: { id: string; first_name: string; last_name: string };
  created_at: string;
}

interface PaginatedLeads {
  items: CRMLead[];
  total: number;
  page: number;
  pages: number;
}

export function useAdminLeads(params: {
  page?: number;
  page_size?: number;
  lead_status?: string;
  assigned_to?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return useQuery({
    queryKey: ["admin", "leads", params],
    queryFn: () => apiGet<PaginatedLeads>(`/crm/leads${qs ? `?${qs}` : ""}`),
    retry: 1,
  });
}

export interface AdminPromotion {
  id: string;
  name: string;
  code: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applies_to: string;
  usage_limit: number | null;
  used_count: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export function useAdminPromotions() {
  return useQuery({
    queryKey: ["admin", "promotions"],
    queryFn: () => apiGet<AdminPromotion[]>("/promotions"),
    retry: 1,
  });
}


// ============================================================
// Users (staff management)
// ============================================================

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  avatar: string | null;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<AdminUser[]>("/users"),
    retry: 1,
  });
}

// ============================================================
// Reviews (admin)
// ============================================================

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  is_visible: boolean;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  product?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useAdminReviews(params: { is_approved?: boolean; page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return useQuery({
    queryKey: ["admin", "reviews", params],
    queryFn: () => apiGet<AdminReview[]>(`/reviews${qs ? `?${qs}` : ""}`),
    retry: 1,
  });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => apiPatch(`/reviews/${reviewId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });
}

export function useRejectReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => apiPatch(`/reviews/${reviewId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });
}
