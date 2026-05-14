import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const menusApi = {
  getOwnerMenu: (restaurantId: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/restaurants/${restaurantId}/menu/manage`),

  createCategory: (restaurantId: string, data: { name: string; description?: string }) =>
    apiClient.post<ApiResponse<{ id: string; name: string }>>(`/restaurants/${restaurantId}/menu/categories`, data),

  updateCategory: (restaurantId: string, categoryId: string, data: { name?: string; description?: string }) =>
    apiClient.patch(`/restaurants/${restaurantId}/menu/categories/${categoryId}`, data),

  deleteCategory: (restaurantId: string, categoryId: string) =>
    apiClient.delete(`/restaurants/${restaurantId}/menu/categories/${categoryId}`),

  createItem: (
    restaurantId: string,
    data: {
      categoryId: string;
      name: string;
      description?: string;
      price: number;
      isVegetarian?: boolean;
      isVegan?: boolean;
      preparationTimeMin?: number;
    },
  ) => apiClient.post(`/restaurants/${restaurantId}/menu/items`, data),

  updateItem: (
    restaurantId: string,
    itemId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      isVegetarian?: boolean;
      isVegan?: boolean;
      categoryId?: string;
    },
  ) => apiClient.patch(`/restaurants/${restaurantId}/menu/items/${itemId}`, data),

  setAvailability: (restaurantId: string, itemId: string, isAvailable: boolean) =>
    apiClient.patch(`/restaurants/${restaurantId}/menu/items/${itemId}/availability`, { isAvailable }),

  deleteItem: (restaurantId: string, itemId: string) =>
    apiClient.delete(`/restaurants/${restaurantId}/menu/items/${itemId}`),
};
