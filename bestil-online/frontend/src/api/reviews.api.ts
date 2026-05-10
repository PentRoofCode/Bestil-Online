import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export interface Review {
  id: string;
  orderId: string;
  userId: string;
  restaurantId: string;
  rating: number;
  foodRating: number | null;
  deliveryRating: number | null;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

export interface AdminReview extends Review {
  restaurant: { name: string };
  user: Review["user"] & { email: string };
}

export const reviewsApi = {
  create: (orderId: string, data: { rating: number; foodRating?: number; deliveryRating?: number; comment?: string }) =>
    apiClient.post<ApiResponse<Review>>(`/orders/${orderId}/review`, data),

  listByRestaurant: (restaurantId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Review[]>>(`/restaurants/${restaurantId}/reviews`, { params }),

  adminList: (params?: { page?: number; limit?: number; restaurantId?: string; isVisible?: boolean }) =>
    apiClient.get<ApiResponse<AdminReview[]>>("/admin/reviews", { params }),

  setVisibility: (id: string, isVisible: boolean) =>
    apiClient.patch<ApiResponse<Review>>(`/admin/reviews/${id}/visibility`, { isVisible }),
};
