import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export const addressesApi = {
  list: () => apiClient.get<ApiResponse<Address[]>>("/users/me/addresses"),
  create: (data: Omit<Address, "id">) =>
    apiClient.post<ApiResponse<Address>>("/users/me/addresses", data),
};
