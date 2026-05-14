/**
 * Lightweight API client for test setup. Uses fetch — no axios.
 * Always interacts at the API level for SETUP, never to test what
 * the UI is supposed to test.
 */
import type { APIRequestContext } from "@playwright/test";

const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000/api/v1";

export interface SeededUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "RESTAURANT_OWNER" | "ADMIN" | "SUPER_ADMIN";
}

export interface AuthTokens {
  accessToken: string;
  cookieHeader: string;
}

export const SEED = {
  admin: { email: "admin@bestil.online", password: "Password123!" },
  owner1: { email: "owner1@bestil.online", password: "Password123!" },
  owner2: { email: "owner2@bestil.online", password: "Password123!" },
  customer: { email: "customer@bestil.online", password: "Password123!" },
} as const;

export const SEEDED_RESTAURANT_SLUGS = {
  italian: "la-bella-italia",
  sushi: "sushi-zen",
  burger: "burgerbyen",
} as const;

/**
 * Unique suffix for ephemeral data so parallel tests don't collide.
 */
export function uniq(prefix = "t"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

/**
 * Login a seeded user via the API, returning access token and refresh cookie.
 * For Playwright, we apply the refresh cookie to the browser context, then
 * inject the access token into the Zustand auth store before navigation.
 */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { accessToken: string } };
  const cookies = res.headers()["set-cookie"] ?? "";
  return { accessToken: body.data.accessToken, cookieHeader: cookies };
}

export async function apiRegister(
  request: APIRequestContext,
  data: { email: string; password: string; firstName: string; lastName: string; role?: string },
): Promise<void> {
  const res = await request.post(`${API}/auth/register`, { data });
  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${await res.text()}`);
  }
}

interface BearerOpts {
  token: string;
}

export async function apiCreateAddress(
  request: APIRequestContext,
  opts: BearerOpts,
  data: { label: string; street: string; city: string; postalCode: string; isDefault?: boolean },
): Promise<{ id: string }> {
  const res = await request.post(`${API}/users/me/addresses`, {
    data,
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Create address failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: { id: string } };
  return body.data;
}

export async function apiGetAddresses(
  request: APIRequestContext,
  opts: BearerOpts,
): Promise<Array<{ id: string; label: string; isDefault: boolean }>> {
  const res = await request.get(`${API}/users/me/addresses`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Get addresses failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: Array<{ id: string; label: string; isDefault: boolean }> };
  return body.data;
}

export async function apiCreateRestaurant(
  request: APIRequestContext,
  opts: BearerOpts,
  overrides: Partial<{
    name: string;
    description: string;
    phone: string;
    email: string;
    street: string;
    city: string;
    postalCode: string;
    cuisines: string[];
    deliveryFee: number;
    minimumOrderAmount: number;
    deliveryTimeMin: number;
  }> = {},
): Promise<{ id: string; slug: string }> {
  const suffix = uniq("r");
  const hours = { mon: { open: "10:00", close: "22:00" } };
  const days = ["tue", "wed", "thu", "fri", "sat", "sun"];
  const openingHours = { mon: hours.mon };
  for (const d of days) {
    (openingHours as Record<string, typeof hours.mon>)[d] = hours.mon;
  }
  const data = {
    name: `Test Restaurant ${suffix}`,
    description: "Auto-created by e2e",
    phone: "+45 11 22 33 44",
    email: `r-${suffix}@test.dk`,
    street: "Testvej 1",
    city: "København",
    postalCode: "2200",
    cuisines: ["Test"],
    openingHours,
    deliveryFee: 0,
    minimumOrderAmount: 0,
    deliveryTimeMin: 20,
    ...overrides,
  };
  const res = await request.post(`${API}/restaurants`, {
    data,
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Create restaurant failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: { id: string; slug: string } };
  return body.data;
}

export async function apiVerifyRestaurant(
  request: APIRequestContext,
  opts: BearerOpts,
  restaurantId: string,
): Promise<void> {
  const res = await request.post(`${API}/admin/restaurants/${restaurantId}/verify`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Verify restaurant failed: ${res.status()} ${await res.text()}`);
}

export async function apiActivateRestaurant(
  request: APIRequestContext,
  opts: BearerOpts,
  restaurantId: string,
  isActive = true,
): Promise<void> {
  const res = await request.patch(`${API}/restaurants/${restaurantId}`, {
    data: { isActive },
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Activate restaurant failed: ${res.status()} ${await res.text()}`);
}

export async function apiCreateCategory(
  request: APIRequestContext,
  opts: BearerOpts,
  restaurantId: string,
  data: { name: string; displayOrder?: number; description?: string },
): Promise<{ id: string }> {
  const res = await request.post(`${API}/restaurants/${restaurantId}/menu/categories`, {
    data,
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Create category failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: { id: string } };
  return body.data;
}

export async function apiCreateMenuItem(
  request: APIRequestContext,
  opts: BearerOpts,
  restaurantId: string,
  data: {
    categoryId: string;
    name: string;
    price: number;
    description?: string;
    isVegetarian?: boolean;
    isVegan?: boolean;
  },
): Promise<{ id: string }> {
  const res = await request.post(`${API}/restaurants/${restaurantId}/menu/items`, {
    data,
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Create menu item failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: { id: string } };
  return body.data;
}

export async function apiGetRestaurantBySlug(
  request: APIRequestContext,
  slug: string,
): Promise<{
  id: string;
  name: string;
  minimumOrderAmount: string;
  categories: Array<{
    id: string;
    name: string;
    menuItems: Array<{ id: string; name: string; price: string }>;
  }>;
}> {
  const res = await request.get(`${API}/restaurants/${slug}`);
  if (!res.ok()) throw new Error(`Get restaurant failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: typeof apiGetRestaurantBySlug extends never ? never : any };
  return body.data;
}

export async function apiGetOwnedRestaurants(
  request: APIRequestContext,
  opts: BearerOpts,
): Promise<Array<{ id: string; slug: string; name: string; isActive: boolean; isVerified: boolean }>> {
  const res = await request.get(`${API}/restaurants/me`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Get owned restaurants failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: Array<{ id: string; slug: string; name: string; isActive: boolean; isVerified: boolean }> };
  return body.data;
}

export async function apiCreateOrder(
  request: APIRequestContext,
  opts: BearerOpts,
  data: {
    restaurantId: string;
    deliveryAddressId: string;
    items: Array<{ menuItemId: string; quantity: number; selectedOptions: Array<{ groupName: string; optionName: string; priceModifier: number }> }>;
    specialInstructions?: string;
  },
): Promise<{ order: { id: string; orderNumber: string; totalAmount: string; status: string }; clientSecret: string }> {
  const res = await request.post(`${API}/orders`, {
    data,
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Create order failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: { order: { id: string; orderNumber: string; totalAmount: string; status: string }; clientSecret: string } };
  return body.data;
}

export async function apiAdvanceOrder(
  request: APIRequestContext,
  opts: BearerOpts,
  orderId: string,
  status: string,
): Promise<void> {
  const res = await request.patch(`${API}/orders/${orderId}/status`, {
    data: { status },
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Advance order failed: ${res.status()} ${await res.text()}`);
}

export async function apiSimulateWebhookComplete(
  request: APIRequestContext,
  opts: BearerOpts,
  orderId: string,
): Promise<void> {
  // For e2e tests without the Stripe CLI listener running, we directly
  // transition PENDING_PAYMENT → PENDING_CONFIRMATION using the API.
  // The owner/admin endpoint accepts this transition.
  const res = await request.patch(`${API}/orders/${orderId}/status`, {
    data: { status: "PENDING_CONFIRMATION" },
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Simulate webhook failed: ${res.status()} ${await res.text()}`);
}

export async function apiGetOrder(
  request: APIRequestContext,
  opts: BearerOpts,
  orderId: string,
): Promise<{ id: string; status: string; orderNumber: string }> {
  const res = await request.get(`${API}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok()) throw new Error(`Get order failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { data: { id: string; status: string; orderNumber: string } };
  return body.data;
}

export const API_URL = API;
