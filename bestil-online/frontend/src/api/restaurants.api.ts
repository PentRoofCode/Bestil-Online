import { apiClient } from "./client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  city: string;
  cuisines: string[];
  avgRating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryFee: string;
  minimumOrderAmount: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface MenuOption {
  id: string;
  name: string;
  priceModifier: string;
  displayOrder: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  isMultiSelect: boolean;
  displayOrder: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  allergens: string[];
  displayOrder: number;
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  menuItems: MenuItem[];
}

export interface RestaurantDetail extends RestaurantSummary {
  phone: string;
  email: string;
  street: string;
  postalCode: string;
  openingHours: Record<string, { open: string; close: string; closed?: boolean }>;
  categories: MenuCategory[];
}

export const restaurantsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<ApiResponse<RestaurantSummary[]>>("/restaurants", { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<RestaurantDetail>>(`/restaurants/${slug}`),

  getOwned: () =>
    apiClient.get<ApiResponse<RestaurantSummary[]>>("/restaurants/me"),
};
