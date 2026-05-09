import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  unitPrice: string;
  itemTotal: string;
  selectedOptions: { groupName: string; optionName: string; priceModifier: number }[] | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  deliveryFee: string;
  tax: string;
  totalAmount: string;
  specialInstructions: string | null;
  createdAt: string;
  items: OrderItem[];
  restaurant: { name: string; slug: string; logoUrl: string | null };
}

export interface CreateOrderPayload {
  restaurantId: string;
  deliveryAddressId: string;
  items: {
    menuItemId: string;
    quantity: number;
    selectedOptions?: { groupName: string; optionName: string; priceModifier: number }[];
    specialInstructions?: string;
  }[];
  specialInstructions?: string;
}

export const ordersApi = {
  create: (data: CreateOrderPayload) =>
    apiClient.post<ApiResponse<{ order: Order; clientSecret: string }>>("/orders", data),

  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<ApiResponse<Order[]>>("/orders", { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Order & { payment: { status: string } | null; deliveryAddress: { street: string; city: string } }>>(`/orders/${id}`),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/orders/${id}/cancel`, { reason }),

  getRestaurantOrders: (restaurantId: string, params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<Order[]>>(`/restaurants/${restaurantId}/orders`, { params }),

  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/orders/${id}/status`, { status }),
};
