import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectedOption {
  groupName: string;
  optionName: string;
  priceModifier: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  specialInstructions?: string;
}

interface CartState {
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  items: CartItem[];
  addItem: (restaurantId: string, restaurantSlug: string, restaurantName: string, item: CartItem) => boolean;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantSlug: null,
      restaurantName: null,
      items: [],

      addItem: (restaurantId, restaurantSlug, restaurantName, item) => {
        const state = get();
        if (state.restaurantId && state.restaurantId !== restaurantId) {
          return false; // caller should confirm and call clear() first
        }
        set((s) => {
          const existing = s.items.find(
            (i) =>
              i.menuItemId === item.menuItemId &&
              JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions),
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return {
            restaurantId,
            restaurantSlug,
            restaurantName,
            items: [...s.items, item],
          };
        });
        return true;
      },

      removeItem: (menuItemId) =>
        set((s) => ({
          items: s.items.filter((i) => i.menuItemId !== menuItemId),
          ...(s.items.length === 1 && { restaurantId: null, restaurantSlug: null, restaurantName: null }),
        })),

      updateQuantity: (menuItemId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.menuItemId !== menuItemId)
              : s.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
        })),

      clear: () => set({ restaurantId: null, restaurantSlug: null, restaurantName: null, items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => {
          const optExtra = i.selectedOptions.reduce((s, o) => s + o.priceModifier, 0);
          return sum + (i.price + optExtra) * i.quantity;
        }, 0),
    }),
    { name: "bestil-cart" },
  ),
);
