import { apiClient } from "./client";
import type { AuthUser } from "@/stores/authStore";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => apiClient.post<ApiResponse<AuthUser>>("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<LoginResponse>>("/auth/login", data),

  logout: () => apiClient.post("/auth/logout"),

  me: () => apiClient.get<ApiResponse<AuthUser>>("/auth/me"),

  refresh: () => apiClient.post<ApiResponse<{ accessToken: string }>>("/auth/refresh"),
};
