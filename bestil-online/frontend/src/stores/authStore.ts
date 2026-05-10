import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "RESTAURANT_OWNER" | "ADMIN" | "SUPER_ADMIN";
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isHydrating: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  setHydrated: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrating: true,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrated: () => set({ isHydrating: false }),
  logout: () => set({ user: null, accessToken: null }),
}));
