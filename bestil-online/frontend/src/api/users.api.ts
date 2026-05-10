import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  profilePicture: string | null;
  emailVerified: boolean;
}

export const usersApi = {
  getProfile: () => apiClient.get<ApiResponse<UserProfile>>("/users/me"),

  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    apiClient.patch<ApiResponse<UserProfile>>("/users/me", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post("/users/me/change-password", data),
};
