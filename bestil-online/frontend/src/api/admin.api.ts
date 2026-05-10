import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export interface AdminStats {
  today: { orders: number; revenue: number };
  month: { orders: number; revenue: number; aov: number };
  activeRestaurants: number;
  pendingRestaurants: number;
}

export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  isActive: boolean;
  isVerified: boolean;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  owner: { email: string; firstName: string; lastName: string };
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  restaurant: { name: string };
  user: { email: string; firstName: string; lastName: string };
  payment: { status: string; amount: string } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface RevenueRow {
  period: string;
  revenue: number;
  orders: number;
}

export const adminApi = {
  getStats: () => apiClient.get<ApiResponse<AdminStats>>("/admin/stats/overview"),

  listRestaurants: (params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<AdminRestaurant[]>>("/admin/restaurants", { params }),

  verifyRestaurant: (id: string) => apiClient.post(`/admin/restaurants/${id}/verify`),

  suspendRestaurant: (id: string, reason?: string) =>
    apiClient.post(`/admin/restaurants/${id}/suspend`, { reason }),

  reactivateRestaurant: (id: string) => apiClient.post(`/admin/restaurants/${id}/reactivate`),

  listOrders: (params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<AdminOrder[]>>("/admin/orders", { params }),

  listUsers: (params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<AdminUser[]>>("/admin/users", { params }),

  setUserStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/users/${id}/status`, { isActive }),

  revenueReport: (params: { from: string; to: string; groupBy: string }) =>
    apiClient.get<ApiResponse<RevenueRow[]>>("/admin/reports/revenue", { params }),
};
