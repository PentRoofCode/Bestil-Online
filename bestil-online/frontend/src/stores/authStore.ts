import { create } from "zustand";
import { useCartStore } from "./cartStore";

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isHydrating: true,
  setAuth: (user, accessToken) => {
    const prev = get().user;
    if (prev && prev.id !== user.id) {
      useCartStore.getState().clear();
    }
    set({ user, accessToken });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrated: () => set({ isHydrating: false }),
  logout: () => set({ user: null, accessToken: null }),
}));
